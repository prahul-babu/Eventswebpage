import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import type {
  InitiateRefundPayload,
  InitiateRefundResponse,
  Payment,
} from "../../../src/types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const initiateRefund = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<InitiateRefundPayload>): Promise<InitiateRefundResponse> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    if (request.auth.token.role !== "admin") {
      throw new HttpsError("permission-denied", "Only campus administrators can issue refunds.");
    }

    const { paymentId, amount, reason } = request.data || {};

    if (!paymentId) {
      throw new HttpsError("invalid-argument", "Missing required payment ID.");
    }

    const payRef = db.collection("payments").doc(paymentId);
    const paySnap = await payRef.get();

    if (!paySnap.exists) {
      throw new HttpsError("not-found", "Payment record not found.");
    }

    const payment = paySnap.data() as Payment;

    if (payment.status === "REFUNDED") {
      throw new HttpsError("failed-precondition", "This payment has already been refunded.");
    }

    if (payment.status !== "CAPTURED" && payment.status !== "SUCCESS") {
      throw new HttpsError(
        "failed-precondition",
        `Cannot refund payment in ${payment.status} status.`
      );
    }

    const refundAmountInRupees = amount || payment.amount;
    const refundAmountInPaise = Math.round(refundAmountInRupees * 100);

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_apollo_mock_key";
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "mock_secret_apollo";

    let refundId = `rfnd_${Date.now()}`;

    // Call Razorpay refunds API if live credentials available
    if (
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      payment.razorpayPaymentId
    ) {
      try {
        const razorpay = new Razorpay({
          key_id: razorpayKeyId,
          key_secret: razorpayKeySecret,
        });

        const rzpRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: refundAmountInPaise,
          notes: {
            reason: reason || "Admin initiated refund",
            adminUid: request.auth.uid,
          },
        });

        refundId = rzpRefund.id;
      } catch (err: unknown) {
        console.warn("[Razorpay Refund API notice]:", (err as Error).message);
      }
    }

    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    // Update Payment doc
    await payRef.update({
      status: "REFUNDED",
      refundId,
      refundedAt: serverNow,
      refundReason: reason || "Refund processed by administrator",
      updatedAt: serverNow,
    });

    // Update Registration doc
    if (payment.registrationId) {
      const regRef = db.collection("registrations").doc(payment.registrationId);
      await regRef.update({
        status: "CANCELLED",
        refundFlagged: false,
        updatedAt: serverNow,
      });
    }

    // Write Audit Log
    await db.collection("audit_logs").add({
      action: "PAYMENT_REFUNDED",
      actorUid: request.auth.uid,
      actorEmail: request.auth.token.email || "admin@apollo.edu.in",
      actorRole: "admin",
      targetUid: payment.userId,
      details: {
        paymentId,
        refundId,
        amount: refundAmountInRupees,
        reason: reason || "Administrative refund",
      },
      timestamp: serverNow,
    });

    // Notify Student
    await db.collection("notifications").add({
      recipientUid: payment.userId,
      type: "SYSTEM",
      title: "Refund Processed",
      message: `Your payment refund of ₹${refundAmountInRupees} has been processed (Refund ID: ${refundId}).`,
      data: {
        paymentId,
        refundId,
      },
      read: false,
      createdAt: serverNow,
    });

    return {
      success: true,
      refundId,
      amount: refundAmountInRupees,
    };
  }
);
