import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface WithdrawEventPayload {
  eventId: string;
}

export const withdrawEvent = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<WithdrawEventPayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to withdraw event approval request.");
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
      throw new HttpsError("not-found", "Event record is empty.");
    }

    if (event.organiserId !== uid && request.auth.token.role !== "admin") {
      throw new HttpsError("permission-denied", "You can only withdraw your own events.");
    }

    if (event.status !== "PENDING_APPROVAL") {
      throw new HttpsError(
        "failed-precondition",
        `Only events in PENDING_APPROVAL status can be withdrawn (current status: ${event.status}).`
      );
    }

    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    await eventRef.update({
      status: "DRAFT",
      updatedAt: serverNow,
    });

    await db.collection("audit_logs").add({
      action: "EVENT_WITHDRAWN",
      actorUid: uid,
      actorEmail: request.auth.token.email || "faculty@apollo.edu.in",
      actorRole: request.auth.token.role || "faculty",
      targetUid: uid,
      details: {
        eventId,
        title: event.title,
      },
      timestamp: serverNow,
    });

    return {
      success: true,
      eventId,
      status: "DRAFT",
    };
  }
);
