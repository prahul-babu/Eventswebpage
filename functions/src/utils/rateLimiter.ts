import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Firestore-backed Sliding Window Rate Limiter
 * Enforces per-user rate limits on critical operations.
 *
 * @param uid User ID / Client ID
 * @param action Name of the action (e.g. 'createRegistration', 'createPaymentOrder', 'requestAccess')
 * @param maxRequests Maximum allowed requests in the time window (e.g. 5)
 * @param windowSeconds Window length in seconds (e.g. 60)
 */
export async function assertRateLimit(
  uid: string,
  action: string,
  maxRequests: number = 5,
  windowSeconds: number = 60
): Promise<void> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const docRef = db.collection("rate_limits").doc(`${uid}_${action}`);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(docRef);

    if (!snap.exists) {
      transaction.set(docRef, {
        timestamps: [now],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const data = snap.data();
    const timestamps: number[] = (data?.timestamps || []).filter(
      (t: number) => now - t < windowMs
    );

    if (timestamps.length >= maxRequests) {
      throw new HttpsError(
        "resource-exhausted",
        `Too many requests for ${action}. Rate limit of ${maxRequests} requests per ${windowSeconds}s reached. Please wait.`
      );
    }

    timestamps.push(now);
    transaction.set(
      docRef,
      {
        timestamps,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}
