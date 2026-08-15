import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { notify } from "../notifications/service";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface SubmitEventReportPayload {
  eventId: string;
}

export const submitEventReport = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<SubmitEventReportPayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to submit post-event reports.");
    }

    const callerUid = request.auth.uid;
    const { eventId } = request.data || {};

    if (!eventId) {
      throw new HttpsError("invalid-argument", "Missing required event ID.");
    }

    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event document not found.");
    }

    const event = eventSnap.data()!;
    if (event.organiserId !== callerUid && request.auth.token.role !== "admin") {
      throw new HttpsError("permission-denied", "You can only submit reports for events you organised.");
    }

    if (event.status !== "COMPLETED" && event.status !== "PUBLISHED") {
      throw new HttpsError(
        "failed-precondition",
        "Reports can only be compiled and submitted for completed campus events."
      );
    }

    const reportRef = db.collection("reports").doc(eventId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      throw new HttpsError("not-found", "Report draft not found. Please save your report draft first.");
    }

    const report = reportSnap.data()!;

    // Validate Required Sections
    if (!report.summary?.executiveSummary || report.summary.executiveSummary.trim().length < 20) {
      throw new HttpsError(
        "invalid-argument",
        "Executive Summary in Section 1 must be completed before submission."
      );
    }

    if (!report.institutionalMapping?.naacCriterion) {
      throw new HttpsError(
        "invalid-argument",
        "NAAC Criterion mapping in Section 7 is mandatory for accreditation."
      );
    }

    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    const userEmail = request.auth.token.email || "faculty@apollo.edu.in";
    const userName = request.auth.token.name || event.organiserName || "Faculty Organiser";

    // 1. Update Report Status
    await reportRef.update({
      status: "SUBMITTED",
      submittedAt: serverNow,
      updatedAt: serverNow,
    });

    // 2. Update Event Document
    await eventRef.update({
      reportStatus: "SUBMITTED",
      updatedAt: serverNow,
    });

    // 3. Write Audit Log
    await db.collection("audit_logs").add({
      action: "EVENT_REPORT_SUBMITTED",
      actorUid: callerUid,
      actorEmail: userEmail,
      actorRole: "faculty",
      targetUid: eventId,
      details: {
        eventId,
        eventTitle: event.title,
        department: event.department,
        naacCriterion: report.institutionalMapping?.naacCriterion,
      },
      timestamp: serverNow,
    });

    // 4. Notify Campus Administrators via notify() service
    await notify({
      role: "admin",
      type: "REPORT_DUE" as any,
      title: "New Post-Event Report Submitted",
      body: `${userName} submitted the institutional report for "${event.title}".`,
      link: `/admin/reports/${eventId}`,
      emailTemplate: "report-due",
      emailData: {
        eventTitle: event.title,
        eventId,
        organiserName: userName,
      },
      priority: "HIGH",
    });

    return {
      success: true,
      eventId,
      status: "SUBMITTED",
    };
  }
);
