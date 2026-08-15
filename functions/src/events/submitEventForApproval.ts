import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { notify } from "../notifications/service";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface SubmitEventPayload {
  eventId: string;
}

export const submitEventForApproval = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<SubmitEventPayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to submit events.");
    }

    const uid = request.auth.uid;
    const { eventId } = request.data || {};

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

    // 1. Assert Ownership
    if (event.organiserId !== uid && request.auth.token.role !== "admin") {
      throw new HttpsError("permission-denied", "You can only submit events that you organised.");
    }

    // 2. Assert status is DRAFT or REJECTED
    if (event.status !== "DRAFT" && event.status !== "REJECTED") {
      throw new HttpsError(
        "failed-precondition",
        `Only events in DRAFT or REJECTED status can be submitted for approval (current status: ${event.status}).`
      );
    }

    // 3. Validation
    if (!event.title || event.title.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Event title is required.");
    }

    if (!event.description || event.description.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Event description is required.");
    }

    const startAt = event.startAt?.toDate ? event.startAt.toDate() : new Date(event.startAt);
    const endAt = event.endAt?.toDate ? event.endAt.toDate() : new Date(event.endAt);
    const regDeadline = event.registrationDeadline?.toDate ? event.registrationDeadline.toDate() : new Date(event.registrationDeadline);
    const now = new Date();

    if (startAt <= now) {
      throw new HttpsError("invalid-argument", "Event start time must be in the future.");
    }

    if (endAt <= startAt) {
      throw new HttpsError("invalid-argument", "Event end time must be after the start time.");
    }

    if (regDeadline > startAt) {
      throw new HttpsError("invalid-argument", "Registration deadline must be on or before the event start time.");
    }

    const capacity = Number(event.capacity) || 0;
    if (capacity <= 0) {
      throw new HttpsError("invalid-argument", "Event capacity must be at least 1 attendee.");
    }

    if (event.isPaid) {
      const price = Number(event.price) || 0;
      if (price < 1 || price > 50000) {
        throw new HttpsError("invalid-argument", "Paid event registration fee must be between ₹1 and ₹50,000.");
      }
    }

    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    // 4. Update Event status to PENDING_APPROVAL
    await eventRef.update({
      status: "PENDING_APPROVAL",
      submittedAt: serverNow,
      rejectionReason: admin.firestore.FieldValue.delete(),
      updatedAt: serverNow,
    });

    // 5. Write Audit Log
    await db.collection("audit_logs").add({
      action: "EVENT_SUBMITTED_FOR_APPROVAL",
      actorUid: uid,
      actorEmail: request.auth.token.email || "faculty@apollo.edu.in",
      actorRole: request.auth.token.role || "faculty",
      targetUid: uid,
      details: {
        eventId,
        title: event.title,
        category: event.category,
        capacity,
        isPaid: Boolean(event.isPaid),
      },
      timestamp: serverNow,
    });

    // 6. Notify Campus Administrators via notify() service
    await notify({
      role: "admin",
      type: "EVENT_SUBMITTED" as any,
      title: "New Event Awaiting Approval",
      body: `${event.organiserName || "Faculty"} submitted "${event.title}" for approval.`,
      link: `/admin/approvals/${eventId}`,
      emailTemplate: "event-submitted-admin",
      emailData: {
        eventTitle: event.title,
        eventId,
        organiserName: event.organiserName,
        department: event.department,
        venue: event.venueLocation,
      },
      priority: "HIGH",
    });

    return {
      success: true,
      eventId,
      status: "PENDING_APPROVAL",
    };
  }
);
