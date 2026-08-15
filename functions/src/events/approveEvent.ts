import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { notify } from "../notifications/service";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface ApproveEventPayload {
  eventId: string;
  reviewerNotes?: string;
  notifyDepartmentStudents?: boolean;
}

export const approveEvent = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<ApproveEventPayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to approve events.");
    }

    const callerUid = request.auth.uid;
    const userRole = request.auth.token.role || "student";

    // 1. Assert Caller is Administrator
    if (userRole !== "admin") {
      const callerUserDoc = await db.collection("users").doc(callerUid).get();
      if (!callerUserDoc.exists || callerUserDoc.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Only campus administrators can approve events.");
      }
    }

    const { eventId, reviewerNotes } = request.data || {};
    if (!eventId) {
      throw new HttpsError("invalid-argument", "Missing required event ID.");
    }

    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event document not found.");
    }

    const event = eventSnap.data();
    if (!event) {
      throw new HttpsError("not-found", "Event data is empty.");
    }

    // 2. Assert Event Status is PENDING_APPROVAL
    if (event.status !== "PENDING_APPROVAL") {
      throw new HttpsError(
        "failed-precondition",
        `Only events in PENDING_APPROVAL status can be approved (current status: ${event.status}).`
      );
    }

    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    const adminEmail = request.auth.token.email || "admin@apollo.edu.in";
    const adminName = request.auth.token.name || "Campus Administrator";

    // 3. Update Event Document to PUBLISHED
    await eventRef.update({
      status: "PUBLISHED",
      approvedBy: callerUid,
      approvedByName: adminName,
      approvedAt: serverNow,
      reviewedBy: callerUid,
      reviewedAt: serverNow,
      reviewerNotes: reviewerNotes || "",
      rejectionReason: admin.firestore.FieldValue.delete(),
      updatedAt: serverNow,
    });

    // 4. Write Audit Log
    await db.collection("audit_logs").add({
      action: "EVENT_APPROVED",
      actorUid: callerUid,
      actorEmail: adminEmail,
      actorRole: "admin",
      targetUid: event.organiserId,
      details: {
        eventId,
        title: event.title,
        category: event.category,
        reviewerNotes: reviewerNotes || "",
      },
      timestamp: serverNow,
    });

    // 5. Notify Organiser via notify() service
    if (event.organiserId) {
      await notify({
        userIds: [event.organiserId],
        type: "EVENT_APPROVED",
        title: "Event Approved & Published!",
        body: `Congratulations! "${event.title}" has received clearance from ${adminName} and is now live for student registrations.`,
        link: `/events/${eventId}`,
        emailTemplate: "event-approved",
        emailData: {
          eventTitle: event.title,
          eventId,
        },
        priority: "HIGH",
      });
    }

    return {
      success: true,
      eventId,
      status: "PUBLISHED",
    };
  }
);
