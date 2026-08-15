import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface BulkApprovePayload {
  eventIds: string[];
}

export const bulkApproveEvents = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<BulkApprovePayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to bulk approve events.");
    }

    const callerUid = request.auth.uid;
    const userRole = request.auth.token.role || "student";

    if (userRole !== "admin") {
      const callerUserDoc = await db.collection("users").doc(callerUid).get();
      if (!callerUserDoc.exists || callerUserDoc.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Only campus administrators can bulk approve events.");
      }
    }

    const { eventIds } = request.data || {};
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      throw new HttpsError("invalid-argument", "Please provide a non-empty array of event IDs.");
    }

    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    const adminEmail = request.auth.token.email || "admin@apollo.edu.in";
    const adminName = request.auth.token.name || "Campus Administrator";

    const results: { eventId: string; success: boolean; title?: string; error?: string }[] = [];

    for (const eventId of eventIds) {
      try {
        const eventRef = db.collection("events").doc(eventId);
        const eventSnap = await eventRef.get();

        if (!eventSnap.exists) {
          results.push({ eventId, success: false, error: "Event not found" });
          continue;
        }

        const event = eventSnap.data();
        if (!event) {
          results.push({ eventId, success: false, error: "Event data empty" });
          continue;
        }

        if (event.status !== "PENDING_APPROVAL") {
          results.push({
            eventId,
            success: false,
            title: event.title,
            error: `Cannot approve event in ${event.status} status`,
          });
          continue;
        }

        // Update to PUBLISHED
        await eventRef.update({
          status: "PUBLISHED",
          approvedBy: callerUid,
          approvedByName: adminName,
          approvedAt: serverNow,
          reviewedBy: callerUid,
          reviewedAt: serverNow,
          rejectionReason: admin.firestore.FieldValue.delete(),
          updatedAt: serverNow,
        });

        // Audit Log
        await db.collection("audit_logs").add({
          action: "EVENT_APPROVED",
          actorUid: callerUid,
          actorEmail: adminEmail,
          actorRole: "admin",
          targetUid: event.organiserId,
          details: { eventId, title: event.title, method: "BULK_APPROVAL" },
          timestamp: serverNow,
        });

        // Notify Organiser
        if (event.organiserId) {
          await db.collection("notifications").add({
            recipientUid: event.organiserId,
            type: "EVENT_APPROVED",
            title: "Event Approved & Published!",
            message: `"${event.title}" has been approved and published to the campus catalog.`,
            data: { eventId, link: `/events/${eventId}` },
            read: false,
            createdAt: serverNow,
          });
        }

        results.push({ eventId, success: true, title: event.title });
      } catch (err: any) {
        results.push({ eventId, success: false, error: err.message || "Failed to process approval" });
      }
    }

    return {
      success: true,
      processedCount: eventIds.length,
      approvedCount: results.filter((r) => r.success).length,
      results,
    };
  }
);
