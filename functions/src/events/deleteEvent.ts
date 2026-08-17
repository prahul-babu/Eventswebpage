import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface DeleteEventPayload {
  eventId: string;
}

export const deleteEvent = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<DeleteEventPayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to delete events.");
    }

    const callerUid = request.auth.uid;
    const userRole = request.auth.token.role || "student";

    // 1. Assert Caller is Administrator
    if (userRole !== "admin") {
      const callerUserDoc = await db.collection("users").doc(callerUid).get();
      if (!callerUserDoc.exists || callerUserDoc.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Only campus administrators are authorized to permanently delete events.");
      }
    }

    const { eventId } = request.data || {};
    if (!eventId) {
      throw new HttpsError("invalid-argument", "Missing required event ID.");
    }

    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event document does not exist or has already been deleted.");
    }

    const eventData = eventSnap.data() || {};
    const eventTitle = eventData.title || "Untitled Event";
    const organiserId = eventData.organiserId || null;
    const adminEmail = request.auth.token.email || "admin@apollo.edu.in";
    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    // 2. Perform Real Database Deletion
    const batch = db.batch();

    // Delete primary event document
    batch.delete(eventRef);

    // 3. Clean up related event_updates collection
    const updatesSnap = await db.collection("event_updates").where("eventId", "==", eventId).get();
    updatesSnap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    // 4. Clean up subcollections: updates & attachments
    const subUpdatesSnap = await eventRef.collection("updates").get();
    subUpdatesSnap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    const subAttachmentsSnap = await eventRef.collection("attachments").get();
    subAttachmentsSnap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    // 5. Update/cancel registrations associated with this event (without deleting student accounts)
    const registrationsSnap = await db.collection("registrations").where("eventId", "==", eventId).get();
    registrationsSnap.docs.forEach((d) => {
      batch.update(d.ref, {
        status: "CANCELLED",
        cancelledAt: serverNow,
        cancellationReason: "Event permanently removed by university administration",
        updatedAt: serverNow,
      });
    });

    // Commit all deletions and updates
    await batch.commit();

    // 6. Record Audit Log Entry for Governance
    await db.collection("audit_logs").add({
      action: "EVENT_DELETED",
      actorUid: callerUid,
      actorEmail: adminEmail,
      actorRole: "admin",
      targetId: eventId,
      targetType: "EVENT",
      details: {
        eventId,
        title: eventTitle,
        category: eventData.category || "GENERAL",
        venueLocation: eventData.venueLocation || "Campus",
        organiserId,
        registeredCount: eventData.registeredCount || 0,
      },
      timestamp: serverNow,
    });

    return {
      success: true,
      eventId,
      deletedTitle: eventTitle,
      message: `Event "${eventTitle}" was permanently deleted from the database.`,
    };
  }
);
