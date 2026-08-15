import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  CancelRegistrationPayload,
  CancelRegistrationResponse,
  Registration,
  Event,
} from "../../../src/types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const cancelRegistration = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<CancelRegistrationPayload>): Promise<CancelRegistrationResponse> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to cancel event registrations.");
    }

    const uid = request.auth.uid;
    const userRole = request.auth.token.role;
    const data = request.data;

    if (!data || !data.registrationId) {
      throw new HttpsError("invalid-argument", "Missing registration ID.");
    }

    const regRef = db.collection("registrations").doc(data.registrationId);
    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    const cancellationResult = await db.runTransaction(async (transaction) => {
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists) {
        throw new HttpsError("not-found", "Registration document not found.");
      }

      const reg = regSnap.data() as Registration;

      // 1. Verify ownership or admin privileges
      if (reg.userId !== uid && userRole !== "admin") {
        throw new HttpsError("permission-denied", "You can only cancel your own registrations.");
      }

      if (reg.status === "CANCELLED") {
        return { alreadyCancelled: true, eventId: reg.eventId, wasConfirmed: false };
      }

      // 2. Load associated event and verify cancellation deadline
      const eventRef = db.collection("events").doc(reg.eventId);
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists) {
        throw new HttpsError("not-found", "Associated event not found.");
      }

      const event = eventSnap.data() as Event;
      const now = new Date();

      // Ensure event has not already concluded or started past cancellation window
      const rawStartAt = event.startAt as unknown as { toDate?: () => Date };
      const eventStart = typeof rawStartAt?.toDate === "function" ? rawStartAt.toDate() : new Date(event.startAt as unknown as string);
      if (now >= eventStart) {
        throw new HttpsError("failed-precondition", "Cannot cancel registration after event has commenced.");
      }

      const wasConfirmed = reg.status === "CONFIRMED";
      const refundFlagged = Boolean(reg.isPaid && reg.amountPaid > 0);

      // 3. Mark registration CANCELLED
      transaction.update(regRef, {
        status: "CANCELLED",
        cancellationReason: data.reason || "Cancelled by user",
        refundFlagged,
        updatedAt: serverNow,
      });

      // 4. If booking was confirmed, decrement seats and promote waitlist
      let promotedId: string | undefined = undefined;

      if (wasConfirmed) {
        // Query oldest waitlisted student for this event
        const waitlistQuery = await db
          .collection("registrations")
          .where("eventId", "==", reg.eventId)
          .where("status", "==", "WAITLISTED")
          .orderBy("registeredAt", "asc")
          .limit(1)
          .get();

        if (!waitlistQuery.empty) {
          const waitlistDoc = waitlistQuery.docs[0];
          const promotedRef = db.collection("registrations").doc(waitlistDoc.id);
          promotedId = waitlistDoc.id;

          const promotedStatus = event.isPaid ? "PENDING_PAYMENT" : "CONFIRMED";
          transaction.update(promotedRef, {
            status: promotedStatus,
            promotedFromWaitlistAt: serverNow,
            updatedAt: serverNow,
          });

          // If promoted is free confirmed, count remains steady; otherwise decrement
          if (promotedStatus !== "CONFIRMED") {
            transaction.update(eventRef, {
              registeredCount: admin.firestore.FieldValue.increment(-1),
              updatedAt: serverNow,
            });
          }
        } else {
          // No waitlist to promote, decrement registered count
          transaction.update(eventRef, {
            registeredCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: serverNow,
          });
        }
      }

      return {
        alreadyCancelled: false,
        eventId: reg.eventId,
        eventTitle: event.title,
        wasConfirmed,
        refundFlagged,
        promotedId,
      };
    });

    // Write audit log
    await db.collection("audit_logs").add({
      action: "REGISTRATION_CANCELLED",
      actorUid: uid,
      actorEmail: request.auth.token.email || "user@apollo.edu.in",
      actorRole: userRole || "student",
      targetUid: uid,
      details: {
        registrationId: data.registrationId,
        eventId: cancellationResult.eventId,
        promotedWaitlistId: cancellationResult.promotedId || null,
        refundFlagged: cancellationResult.refundFlagged || false,
      },
      timestamp: serverNow,
    });

    // Notify promoted waitlist user if any
    if (cancellationResult.promotedId) {
      const promotedDoc = await db.collection("registrations").doc(cancellationResult.promotedId).get();
      if (promotedDoc.exists) {
        const promotedData = promotedDoc.data();
        await db.collection("notifications").add({
          recipientUid: promotedData?.userId,
          type: "EVENT_REGISTERED",
          title: "Good news! You're off the waitlist!",
          message: `A seat opened up for ${cancellationResult.eventTitle}. Your pass is now ${promotedData?.status}.`,
          data: {
            eventId: cancellationResult.eventId,
            registrationId: cancellationResult.promotedId,
            link: "/my-registrations",
          },
          read: false,
          createdAt: serverNow,
        });
      }
    }

    return {
      success: true,
      promotedWaitlistId: cancellationResult.promotedId,
      refundFlagged: cancellationResult.refundFlagged,
    };
  }
);
