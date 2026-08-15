import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { notify } from "../notifications/service";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface RejectEventPayload {
  eventId: string;
  reason: string;
  reviewerNotes?: string;
  decision: "REJECTED" | "CHANGES_REQUESTED";
}

export const rejectEvent = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<RejectEventPayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to review events.");
    }

    const callerUid = request.auth.uid;
    const userRole = request.auth.token.role || "student";

    if (userRole !== "admin") {
      const callerUserDoc = await db.collection("users").doc(callerUid).get();
      if (!callerUserDoc.exists || callerUserDoc.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Only campus administrators can reject or request changes on events.");
      }
    }

    const { eventId, reason, reviewerNotes, decision } = request.data || {};
    if (!eventId) {
      throw new HttpsError("invalid-argument", "Missing required event ID.");
    }

    if (!reason || reason.trim().length < 10) {
      throw new HttpsError(
        "invalid-argument",
        "A clear reason with at least 10 characters is mandatory when rejecting or requesting changes."
      );
    }

    if (decision !== "REJECTED" && decision !== "CHANGES_REQUESTED") {
      throw new HttpsError(
        "invalid-argument",
        "Invalid review decision. Must be REJECTED or CHANGES_REQUESTED."
      );
    }

    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event record not found.");
    }

    const event = eventSnap.data();
    if (!event) {
      throw new HttpsError("not-found", "Event record is empty.");
    }

    if (event.status !== "PENDING_APPROVAL") {
      throw new HttpsError(
        "failed-precondition",
        `Only events in PENDING_APPROVAL status can be reviewed (current status: ${event.status}).`
      );
    }

    const targetStatus = decision === "CHANGES_REQUESTED" ? "DRAFT" : "REJECTED";
    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    const adminEmail = request.auth.token.email || "admin@apollo.edu.in";
    const adminName = request.auth.token.name || "Campus Administrator";

    // 3. Update Event Record
    await eventRef.update({
      status: targetStatus,
      rejectionReason: reason.trim(),
      reviewedBy: callerUid,
      reviewedByName: adminName,
      reviewedAt: serverNow,
      reviewerNotes: reviewerNotes || "",
      updatedAt: serverNow,
    });

    // 4. Write Audit Log
    await db.collection("audit_logs").add({
      action: decision === "CHANGES_REQUESTED" ? "EVENT_CHANGES_REQUESTED" : "EVENT_REJECTED",
      actorUid: callerUid,
      actorEmail: adminEmail,
      actorRole: "admin",
      targetUid: event.organiserId,
      details: {
        eventId,
        title: event.title,
        decision,
        reason: reason.trim(),
        reviewerNotes: reviewerNotes || "",
      },
      timestamp: serverNow,
    });

    // 5. Notify Organiser via notify() service
    if (event.organiserId) {
      const isChanges = decision === "CHANGES_REQUESTED";
      await notify({
        userIds: [event.organiserId],
        type: isChanges ? ("EVENT_CHANGES_REQUESTED" as any) : "EVENT_REJECTED",
        title: isChanges ? "Changes Requested: Action Required" : "Event Proposal Rejected",
        body: isChanges
          ? `Reviewer feedback on "${event.title}": ${reason.trim()}. Proposal has been reopened for editing.`
          : `Event proposal "${event.title}" was rejected: ${reason.trim()}`,
        link: `/faculty/events/${eventId}/edit`,
        emailTemplate: "event-rejected",
        emailData: {
          eventTitle: event.title,
          eventId,
          reason: reason.trim(),
        },
        priority: "HIGH",
      });
    }

    return {
      success: true,
      eventId,
      status: targetStatus,
      decision,
    };
  }
);
