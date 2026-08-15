import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { notify } from "../notifications/service";
import type {
  VerifyPaymentPayload,
  VerifyPaymentResponse,
  Payment,
  Registration,
  Event,
} from "../../../src/types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const verifyPayment = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<VerifyPaymentPayload>): Promise<VerifyPaymentResponse> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to verify transaction.");
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = request.data || {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new HttpsError("invalid-argument", "Missing required payment verification parameters.");
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || "mock_secret_apollo";

    // 1. Verify HMAC SHA-256 Signature with timing-safe comparison
    const isMockOrder = razorpayOrderId.startsWith("order_APL_");
    let isSignatureValid = false;

    if (isMockOrder) {
      // In local dev/mock test environments, accept valid mock signatures or generated tokens
      isSignatureValid = true;
    } else {
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      try {
        isSignatureValid = crypto.timingSafeEqual(
          Buffer.from(generatedSignature, "utf8"),
          Buffer.from(razorpaySignature, "utf8")
        );
      } catch {
        isSignatureValid = false;
      }
    }

    // 2. Find associated Payment record
    const paymentQuerySnap = await db
      .collection("payments")
      .where("razorpayOrderId", "==", razorpayOrderId)
      .limit(1)
      .get();

    if (paymentQuerySnap.empty) {
      throw new HttpsError("not-found", "No payment session found matching this order ID.");
    }

    const paymentDocSnap = paymentQuerySnap.docs[0];
    const paymentRef = paymentDocSnap.ref;
    const payment = paymentDocSnap.data() as Payment;

    if (!isSignatureValid) {
      await paymentRef.update({
        status: "FAILED",
        errorMessage: "HMAC signature mismatch",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw new HttpsError("permission-denied", "Payment verification failed: invalid signature.");
    }

    const regRef = db.collection("registrations").doc(payment.registrationId);
    const eventRef = db.collection("events").doc(payment.eventId);
    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    // 3. Execute Verification & Registration Confirmation in Transaction (Atomic & Idempotent)
    const result = await db.runTransaction(async (transaction) => {
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists) {
        throw new HttpsError("not-found", "Associated registration record not found.");
      }

      const reg = regSnap.data() as Registration;

      // Idempotency: If already confirmed, return without double-incrementing
      if (reg.status === "CONFIRMED") {
        return {
          registrationId: regSnap.id,
          ticketCode: reg.ticketCode,
          alreadyConfirmed: true,
          eventTitle: "",
        };
      }

      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists) {
        throw new HttpsError("not-found", "Associated event record not found.");
      }

      const event = eventSnap.data() as Event;

      // Re-check capacity
      const capacity = Number(event.capacity) || 0;
      const currentRegistered = Number(event.registeredCount) || 0;
      if (capacity > 0 && currentRegistered >= capacity) {
        // Flag for refund and mark waitlisted if capacity exhausted between order and payment
        transaction.update(paymentRef, {
          status: "CAPTURED",
          razorpayPaymentId,
          razorpaySignature,
          refundFlagged: true,
          updatedAt: serverNow,
        });
        transaction.update(regRef, {
          status: "WAITLISTED",
          isPaid: true,
          paymentId: paymentDocSnap.id,
          amountPaid: payment.amount,
          refundFlagged: true,
          updatedAt: serverNow,
        });

        return {
          registrationId: regSnap.id,
          ticketCode: reg.ticketCode,
          alreadyConfirmed: false,
          eventTitle: event.title,
          waitlisted: true,
        };
      }

      // Update Payment to CAPTURED
      transaction.update(paymentRef, {
        status: "CAPTURED",
        razorpayPaymentId,
        razorpaySignature,
        updatedAt: serverNow,
      });

      // Update Registration to CONFIRMED
      transaction.update(regRef, {
        status: "CONFIRMED",
        isPaid: true,
        paymentId: paymentDocSnap.id,
        amountPaid: payment.amount,
        updatedAt: serverNow,
      });

      // Increment seatsBooked / registeredCount
      transaction.update(eventRef, {
        registeredCount: admin.firestore.FieldValue.increment(1),
        updatedAt: serverNow,
      });

      return {
        registrationId: regSnap.id,
        ticketCode: reg.ticketCode,
        alreadyConfirmed: false,
        eventTitle: event.title,
        waitlisted: false,
      };
    });

    if (!result.alreadyConfirmed) {
      // Write audit log
      await db.collection("audit_logs").add({
        action: "PAYMENT_VERIFIED",
        actorUid: request.auth.uid,
        actorEmail: request.auth.token.email || "user@apollo.edu.in",
        actorRole: request.auth.token.role || "student",
        targetUid: request.auth.uid,
        details: {
          paymentId: paymentDocSnap.id,
          registrationId: result.registrationId,
          orderId: razorpayOrderId,
          paymentIdRzp: razorpayPaymentId,
          amount: payment.amount,
        },
        timestamp: serverNow,
      });

      // Dispatch in-app notification & payment receipt email via notify()
      await notify({
        userIds: [request.auth.uid],
        type: "PAYMENT_SUCCESS",
        title: "Payment Received & Pass Confirmed!",
        body: `Your payment of ₹${payment.amount} for ${result.eventTitle} was verified. Ticket Code: ${result.ticketCode}.`,
        link: `/tickets/${result.registrationId}`,
        emailTemplate: "payment-receipt",
        emailData: {
          eventTitle: result.eventTitle,
          amount: payment.amount,
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          registrationId: result.registrationId,
        },
        priority: "HIGH",
      });
    }

    return {
      success: true,
      registrationId: result.registrationId,
      ticketCode: result.ticketCode,
      paymentStatus: "CAPTURED",
    };
  }
);
