import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface CheckInAttendeePayload {
  eventId: string;
  ticketCode: string;
  undo?: boolean;
}

export interface CheckInAttendeeResponse {
  success: boolean;
  alreadyCheckedIn: boolean;
  registrationId: string;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  rollNumber?: string;
  department?: string;
  photoURL?: string;
  checkedInAt: string;
  undoSuccessful?: boolean;
}

/**
 * Cloud Function: checkInAttendee
 * Scans or manually validates an attendee ticket code for a campus event.
 * Enforces organiser / co-organiser / admin authority.
 * Idempotent: returns existing check-in time if already validated.
 * Supports undo within 5 minutes of check-in.
 */
export const checkInAttendee = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<CheckInAttendeePayload>): Promise<CheckInAttendeeResponse> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to perform event check-in.");
    }

    const callerUid = request.auth.uid;
    const userRole = request.auth.token.role || "student";
    const { eventId, ticketCode, undo = false } = request.data || {};

    if (!eventId || !ticketCode) {
      throw new HttpsError("invalid-argument", "Missing required fields: eventId and ticketCode.");
    }

    // 1. Verify Event & Caller Authority
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event document not found.");
    }

    const event = eventSnap.data()!;
    const isOrganiser = event.organiserId === callerUid;
    const isCoOrganiser = Array.isArray(event.coOrganisers) && event.coOrganisers.includes(callerUid);
    const isAdmin = userRole === "admin";

    if (!isOrganiser && !isCoOrganiser && !isAdmin) {
      throw new HttpsError(
        "permission-denied",
        "Only the event organiser, listed co-organisers, or campus administrators can check in attendees."
      );
    }

    // 2. Query Registration by Ticket Code
    const cleanTicketCode = ticketCode.trim().toUpperCase();
    const regQuery = await db
      .collection("registrations")
      .where("eventId", "==", eventId)
      .where("ticketCode", "==", cleanTicketCode)
      .limit(1)
      .get();

    if (regQuery.empty) {
      // Also attempt payload match if ticket code was prefixed as QR payload
      const altQuery = await db
        .collection("registrations")
        .where("eventId", "==", eventId)
        .where("qrCodePayload", "==", ticketCode.trim())
        .limit(1)
        .get();

      if (altQuery.empty) {
        throw new HttpsError("not-found", `Invalid pass: No booking found for code ${cleanTicketCode} under this event.`);
      }
    }

    const regDoc = regQuery.empty ? (await db.collection("registrations").where("eventId", "==", eventId).where("qrCodePayload", "==", ticketCode.trim()).limit(1).get()).docs[0] : regQuery.docs[0];
    const reg = regDoc.data();
    const regRef = regDoc.ref;

    // Check status
    if (reg.status !== "CONFIRMED" && reg.status !== "ATTENDED") {
      throw new HttpsError(
        "failed-precondition",
        `Pass cannot be checked in. Current registration status: ${reg.status}.`
      );
    }

    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    const nowIso = new Date().toISOString();

    // 3. Handle Undo Action
    if (undo) {
      if (!reg.checkedIn) {
        throw new HttpsError("failed-precondition", "Attendee has not been checked in yet.");
      }

      // Assert undo is within 5 minutes (300,000 ms)
      const checkedInTime = reg.checkedInAt?.toDate ? reg.checkedInAt.toDate().getTime() : 0;
      const elapsedMs = Date.now() - checkedInTime;

      if (elapsedMs > 5 * 60 * 1000) {
        throw new HttpsError("deadline-exceeded", "Check-in undo window has expired (must be within 5 minutes).");
      }

      await regRef.update({
        checkedIn: false,
        status: "CONFIRMED",
        checkedInAt: admin.firestore.FieldValue.delete(),
        checkedInBy: admin.firestore.FieldValue.delete(),
        updatedAt: serverNow,
      });

      return {
        success: true,
        alreadyCheckedIn: false,
        registrationId: regDoc.id,
        ticketCode: reg.ticketCode,
        attendeeName: reg.userDisplayName,
        attendeeEmail: reg.userEmail,
        rollNumber: reg.userRollNumber,
        department: reg.userDepartment,
        checkedInAt: nowIso,
        undoSuccessful: true,
      };
    }

    // 4. Handle Idempotent Duplicate Check-In
    if (reg.checkedIn) {
      const existingTimeStr = reg.checkedInAt?.toDate ? reg.checkedInAt.toDate().toISOString() : nowIso;
      return {
        success: true,
        alreadyCheckedIn: true,
        registrationId: regDoc.id,
        ticketCode: reg.ticketCode,
        attendeeName: reg.userDisplayName,
        attendeeEmail: reg.userEmail,
        rollNumber: reg.userRollNumber,
        department: reg.userDepartment,
        checkedInAt: existingTimeStr,
      };
    }

    // 5. Check in Attendee
    await regRef.update({
      checkedIn: true,
      status: "ATTENDED",
      checkedInAt: serverNow,
      checkedInBy: callerUid,
      updatedAt: serverNow,
    });

    // Write audit log
    await db.collection("audit_logs").add({
      action: "ATTENDEE_CHECKED_IN",
      actorUid: callerUid,
      actorEmail: request.auth.token.email || "faculty@apollo.edu.in",
      actorRole: userRole,
      targetUid: reg.userId,
      details: {
        eventId,
        registrationId: regDoc.id,
        ticketCode: reg.ticketCode,
        attendeeName: reg.userDisplayName,
      },
      timestamp: serverNow,
    });

    return {
      success: true,
      alreadyCheckedIn: false,
      registrationId: regDoc.id,
      ticketCode: reg.ticketCode,
      attendeeName: reg.userDisplayName,
      attendeeEmail: reg.userEmail,
      rollNumber: reg.userRollNumber,
      department: reg.userDepartment,
      checkedInAt: nowIso,
    };
  }
);
