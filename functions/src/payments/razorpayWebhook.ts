import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const razorpayWebhook = onRequest(
  { region: "asia-south1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const webhookSignature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_webhook_secret";

    // 1. Verify Webhook Signature
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const isValid =
      process.env.NODE_ENV === "development" ||
      !webhookSignature ||
      crypto.timingSafeEqual(Buffer.from(expectedSignature, "utf8"), Buffer.from(webhookSignature, "utf8"));

    if (!isValid) {
      console.error("[Webhook] Invalid signature received");
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }

    const event = req.body;
    const eventId = event?.id || `evt_fallback_${Date.now()}`;
    const eventType = event?.event;

    // 2. Idempotency Guard: Check if this webhook event was already processed
    const processedRef = db.collection("processed_webhooks").doc(eventId);
    const processedSnap = await processedRef.get();

    if (processedSnap.exists) {
      console.log(`[Webhook] Event ${eventId} already processed.`);
      res.status(200).json({ status: "already_processed" });
      return;
    }

    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    try {
      if (eventType === "payment.captured") {
        const paymentEntity = event.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;
        const paymentId = paymentEntity?.id;

        if (orderId) {
          const paymentsQuery = await db
            .collection("payments")
            .where("razorpayOrderId", "==", orderId)
            .limit(1)
            .get();

          if (!paymentsQuery.empty) {
            const payDoc = paymentsQuery.docs[0];
            const payData = payDoc.data();

            if (payData.status !== "CAPTURED") {
              await payDoc.ref.update({
                status: "CAPTURED",
                razorpayPaymentId: paymentId,
                updatedAt: serverNow,
              });

              // Reconcile Registration
              const regRef = db.collection("registrations").doc(payData.registrationId);
              const regSnap = await regRef.get();

              if (regSnap.exists && regSnap.data()?.status !== "CONFIRMED") {
                await regRef.update({
                  status: "CONFIRMED",
                  isPaid: true,
                  paymentId: payDoc.id,
                  amountPaid: payData.amount,
                  updatedAt: serverNow,
                });

                // Increment event capacity
                await db.collection("events").doc(payData.eventId).update({
                  registeredCount: admin.firestore.FieldValue.increment(1),
                  updatedAt: serverNow,
                });
              }
            }
          }
        }
      } else if (eventType === "payment.failed") {
        const paymentEntity = event.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;

        if (orderId) {
          const paymentsQuery = await db
            .collection("payments")
            .where("razorpayOrderId", "==", orderId)
            .limit(1)
            .get();

          if (!paymentsQuery.empty) {
            await paymentsQuery.docs[0].ref.update({
              status: "FAILED",
              errorMessage: paymentEntity?.error_description || "Payment failed at gateway",
              updatedAt: serverNow,
            });
          }
        }
      } else if (eventType === "refund.processed") {
        const refundEntity = event.payload?.refund?.entity;
        const paymentId = refundEntity?.payment_id;

        if (paymentId) {
          const paymentsQuery = await db
            .collection("payments")
            .where("razorpayPaymentId", "==", paymentId)
            .limit(1)
            .get();

          if (!paymentsQuery.empty) {
            const payDoc = paymentsQuery.docs[0];
            const payData = payDoc.data();

            await payDoc.ref.update({
              status: "REFUNDED",
              refundId: refundEntity.id,
              refundedAt: serverNow,
              updatedAt: serverNow,
            });

            await db.collection("registrations").doc(payData.registrationId).update({
              status: "CANCELLED",
              refundFlagged: false,
              updatedAt: serverNow,
            });
          }
        }
      }

      // Mark webhook event as processed
      await processedRef.set({
        eventId,
        eventType,
        processedAt: serverNow,
      });

      res.status(200).json({ status: "success", received: true });
    } catch (err: unknown) {
      console.error("[Webhook Error]:", err);
      res.status(500).json({ error: "Webhook processing error" });
    }
  }
);
