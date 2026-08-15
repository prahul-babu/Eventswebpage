import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { notify } from "../notifications/service";
import { assertRateLimit } from "../utils/rateLimiter";
import type { CreateRegistrationPayload } from "../../../src/types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "APL-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const createRegistration = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<CreateRegistrationPayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to register for campus events.");
    }

    const uid = request.auth.uid;
    const userEmail = (request.auth.token.email || "").toLowerCase();
    const data = request.data;

    if (!data || !data.eventId) {
      throw new HttpsError("invalid-argument", "Missing required field: eventId.");
    }

    // Rate Limiter: Max 5 registration attempts per 60s per user
    await assertRateLimit(uid, "createRegistration", 5, 60);

    // 1. Fetch user profile
    const userDocRef = db.collection("users").doc(uid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "User profile must be completed before registering.");
    }

    const userProfile = userSnap.data()!;
    if (userProfile.status !== "ACTIVE") {
      throw new HttpsError(
        "permission-denied",
        "Your account is pending verification or suspended. Registration denied."
      );
    }

    const eventRef = db.collection("events").doc(data.eventId);
    const newRegRef = db.collection("registrations").doc();

    // 2. Transactional Concurrency Gate
    const result = await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) {
        throw new HttpsError("not-found", "Event document not found.");
      }

      const event = eventDoc.data()!;

      // Verify event is active for registrations
      if (event.status !== "PUBLISHED" && event.status !== "ONGOING") {
        throw new HttpsError(
          "failed-precondition",
          `Event is not open for registrations (status: ${event.status}).`
        );
      }

      // Check registration deadline
      const deadline = event.registrationDeadline?.toDate
        ? event.registrationDeadline.toDate()
        : new Date(event.registrationDeadline);

      if (new Date() > deadline) {
        throw new HttpsError("failed-precondition", "Registration for this event has closed.");
      }

      // Duplicate registration check
      const existingRegsQuery = db
        .collection("registrations")
        .where("eventId", "==", data.eventId)
        .where("userId", "==", uid);

      const existingRegsSnap = await transaction.get(existingRegsQuery);
      const activeReg = existingRegsSnap.docs.find((d) => {
        const status = d.data().status;
        return status === "CONFIRMED" || status === "PENDING_PAYMENT" || status === "WAITLISTED";
      });

      if (activeReg) {
        const existingData = activeReg.data();
        throw new HttpsError(
          "already-exists",
          `You already have an active registration (${existingData.status}) with ticket pass #${existingData.ticketCode}.`
        );
      }

      // Capacity & waitlist calculation
      const capacity = Number(event.capacity) || 0;
      const registeredCount = Number(event.registeredCount) || 0;
      const isFull = registeredCount >= capacity;
      const isPaid = Boolean(event.isPaid && Number(event.price) > 0);

      let regStatus: "CONFIRMED" | "PENDING_PAYMENT" | "WAITLISTED" = "CONFIRMED";

      if (isFull) {
        if (event.allowWaitlist) {
          regStatus = "WAITLISTED";
        } else {
          throw new HttpsError("resource-exhausted", "This event is completely booked (Sold Out).");
        }
      } else if (isPaid) {
        regStatus = "PENDING_PAYMENT";
      }

      const ticketCode = generateTicketCode();
      const serverNow = admin.firestore.FieldValue.serverTimestamp();

      const registrationDoc = {
        eventId: data.eventId,
        userId: uid,
        userDisplayName: userProfile.displayName || "Campus Scholar",
        userEmail: userEmail,
        userRollNumber: userProfile.rollNumber || null,
        userDepartment: userProfile.department || "Apollo University",
        userPhone: data.contactPhone || userProfile.phoneNumber || null,
        status: regStatus,
        ticketCode,
        qrCodePayload: `APL-TKT:${data.eventId}:${uid}:${ticketCode}`,
        teamName: data.teamName || null,
        teamMembers: data.teamMembers || [],
        answers: data.answers || {},
        isPaid,
        amountPaid: isPaid ? 0 : 0,
        checkedIn: false,
        registeredAt: serverNow,
        updatedAt: serverNow,
      };

      // Write registration
      transaction.set(newRegRef, registrationDoc);

      // Increment registeredCount only for free confirmed bookings
      if (regStatus === "CONFIRMED") {
        transaction.update(eventRef, {
          registeredCount: admin.firestore.FieldValue.increment(1),
          updatedAt: serverNow,
        });
      }

      return {
        registrationId: newRegRef.id,
        ticketCode,
        status: regStatus,
        requiresPayment: regStatus === "PENDING_PAYMENT",
        amount: isPaid ? Number(event.price) : 0,
        eventTitle: event.title,
        venueLocation: event.venueLocation,
        startAt: event.startAt,
      };
    });

    // Write audit log
    await db.collection("audit_logs").add({
      action: "REGISTRATION_CONFIRMED",
      actorUid: uid,
      actorEmail: userEmail,
      actorRole: userProfile.role || "student",
      targetUid: uid,
      details: {
        eventId: data.eventId,
        registrationId: result.registrationId,
        ticketCode: result.ticketCode,
        status: result.status,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send notifications via notify() service
    if (result.status === "CONFIRMED") {
      await notify({
        userIds: [uid],
        type: "REGISTRATION_CONFIRMED",
        title: "Registration Confirmed!",
        body: `Your pass for ${result.eventTitle} is confirmed. Ticket Code: ${result.ticketCode}.`,
        link: `/tickets/${result.registrationId}`,
        emailTemplate: "registration-confirmed",
        emailData: {
          eventTitle: result.eventTitle,
          ticketCode: result.ticketCode,
          registrationId: result.registrationId,
          venue: result.venueLocation,
          eventDate: result.startAt?.toDate ? result.startAt.toDate().toLocaleDateString() : "Upcoming",
        },
        priority: "HIGH",
      });
    } else if (result.status === "WAITLISTED") {
      await notify({
        userIds: [uid],
        type: "WAITLIST_PROMOTED" as any,
        title: "Added to Waitlist",
        body: `You have been added to the waitlist for ${result.eventTitle}. We'll notify you when a seat opens.`,
        link: "/my-registrations",
        priority: "NORMAL",
      });
    }

    return {
      success: true,
      registrationId: result.registrationId,
      ticketCode: result.ticketCode,
      status: result.status,
      requiresPayment: result.requiresPayment,
      amount: result.amount,
    };
  }
);
