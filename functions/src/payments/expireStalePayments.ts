import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled function running every 15 minutes to cancel stale pending payments (>30 mins)
 */
export const expireStalePayments = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "asia-south1",
  },
  async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    // Query registrations in PENDING_PAYMENT older than 30 mins
    const staleRegsSnap = await db
      .collection("registrations")
      .where("status", "==", "PENDING_PAYMENT")
      .where("registeredAt", "<", thirtyMinutesAgo)
      .limit(50)
      .get();

    if (staleRegsSnap.empty) {
      console.log("[expireStalePayments] No stale registrations found.");
      return;
    }

    console.log(`[expireStalePayments] Found ${staleRegsSnap.docs.length} stale registrations.`);

    for (const regDoc of staleRegsSnap.docs) {
      const regId = regDoc.id;

      // Mark registration CANCELLED
      await regDoc.ref.update({
        status: "CANCELLED",
        cancellationReason: "Payment session timeout (expired after 30 minutes)",
        updatedAt: serverNow,
      });

      // Mark associated payment FAILED
      const paymentsSnap = await db
        .collection("payments")
        .where("registrationId", "==", regId)
        .where("status", "==", "CREATED")
        .limit(1)
        .get();

      if (!paymentsSnap.empty) {
        await paymentsSnap.docs[0].ref.update({
          status: "FAILED",
          errorMessage: "Session expired",
          updatedAt: serverNow,
        });
      }
    }
  }
);
