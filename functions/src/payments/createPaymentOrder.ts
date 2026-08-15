import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import { assertRateLimit } from "../utils/rateLimiter";
import type {
  CreatePaymentOrderPayload,
  CreatePaymentOrderResponse,
  Registration,
  Event,
} from "../../../src/types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const createPaymentOrder = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<CreatePaymentOrderPayload>): Promise<CreatePaymentOrderResponse> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to initiate payment order.");
    }

    const uid = request.auth.uid;
    const { registrationId } = request.data || {};

    if (!registrationId) {
      throw new HttpsError("invalid-argument", "Missing required registration ID.");
    }

    // Rate Limiter: Max 5 payment order creations per 60s per user
    await assertRateLimit(uid, "createPaymentOrder", 5, 60);

    // 1. Check Kill Switch (settings/config.paymentEnabled)
    const configSnap = await db.collection("settings").doc("config").get();
    if (configSnap.exists) {
      const config = configSnap.data();
      if (config?.paymentEnabled === false) {
        throw new HttpsError(
          "failed-precondition",
          "Online payment gateway is temporarily offline for scheduled system maintenance. Please try again later."
        );
      }
    }

    // 2. Load and verify Registration document
    const regRef = db.collection("registrations").doc(registrationId);
    const regSnap = await regRef.get();

    if (!regSnap.exists) {
      throw new HttpsError("not-found", "Registration pass record not found.");
    }

    const reg = regSnap.data() as Registration;

    if (reg.userId !== uid && request.auth.token.role !== "admin") {
      throw new HttpsError("permission-denied", "You can only pay for your own registration.");
    }

    if (reg.status !== "PENDING_PAYMENT") {
      throw new HttpsError(
        "failed-precondition",
        `Cannot create payment order for registration in ${reg.status} status.`
      );
    }

    // 3. Read fee directly from the Event document (Server-side truth)
    const eventRef = db.collection("events").doc(reg.eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Associated event record not found.");
    }

    const event = eventSnap.data() as Event;
    const feeInRupees = Number(event.price) || 0;

    if (feeInRupees <= 0) {
      throw new HttpsError(
        "failed-precondition",
        "This event is free of charge and does not require gateway checkout."
      );
    }

    const amountInPaise = Math.round(feeInRupees * 100);

    // 4. Initialize Razorpay Client
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_apollo_mock_key";
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "mock_secret_apollo";

    let orderId = `order_APL_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Try creating official order via SDK if live/test key is provided
    try {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const razorpay = new Razorpay({
          key_id: razorpayKeyId,
          key_secret: razorpayKeySecret,
        });

        const rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: registrationId,
          notes: {
            eventId: reg.eventId,
            userId: uid,
            eventTitle: event.title,
            studentRollNo: reg.userRollNumber || "",
          },
        });

        orderId = rzpOrder.id;
      }
    } catch (err: unknown) {
      console.warn("[Razorpay] Order creation fallback notice:", (err as Error).message);
    }

    // 5. Create Payment document in Firestore
    const paymentRef = db.collection("payments").doc();
    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    await paymentRef.set({
      userId: uid,
      eventId: reg.eventId,
      registrationId: registrationId,
      amount: feeInRupees,
      amountPaise: amountInPaise,
      currency: "INR",
      status: "CREATED",
      gateway: "RAZORPAY",
      razorpayOrderId: orderId,
      createdAt: serverNow,
      updatedAt: serverNow,
    });

    return {
      orderId,
      amount: amountInPaise,
      currency: "INR",
      razorpayKeyId,
      paymentId: paymentRef.id,
      eventTitle: event.title,
    };
  }
);
