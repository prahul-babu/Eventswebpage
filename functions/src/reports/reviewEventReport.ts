import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { notify } from "../notifications/service";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface ReviewEventReportPayload {
  eventId: string;
  decision: "APPROVED" | "CHANGES_REQUESTED";
  feedback?: string;
}

export const reviewEventReport = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<ReviewEventReportPayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication required to review post-event reports.");
    }

    const callerUid = request.auth.uid;
    const userRole = request.auth.token.role || "student";

    if (userRole !== "admin") {
      const callerUserDoc = await db.collection("users").doc(callerUid).get();
      if (!callerUserDoc.exists || callerUserDoc.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Only campus administrators can approve or request revisions on event reports.");
      }
    }

    const { eventId, decision, feedback } = request.data || {};
    if (!eventId || !decision) {
      throw new HttpsError("invalid-argument", "Missing required event ID or decision.");
    }

    const reportRef = db.collection("reports").doc(eventId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      throw new HttpsError("not-found", "Post-event report document not found.");
    }

    const report = reportSnap.data();
    if (!report) {
      throw new HttpsError("not-found", "Report data empty.");
    }

    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    const adminEmail = request.auth.token.email || "admin@apollo.edu.in";
    const adminName = request.auth.token.name || "Academic Dean / Administrator";

    const targetStatus = decision === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED";

    // 1. Update Report Document
    await reportRef.update({
      status: targetStatus,
      adminFeedback: feedback || "",
      reviewedBy: callerUid,
      reviewedByName: adminName,
      reviewedAt: serverNow,
      updatedAt: serverNow,
    });

    // 2. Update Event Document
    if (eventSnap.exists) {
      await eventRef.update({
        reportStatus: targetStatus,
        updatedAt: serverNow,
      });
    }

    // 3. Write Audit Log
    await db.collection("audit_logs").add({
      action: decision === "APPROVED" ? "EVENT_REPORT_APPROVED" : "EVENT_REPORT_CHANGES_REQUESTED",
      actorUid: callerUid,
      actorEmail: adminEmail,
      actorRole: "admin",
      targetUid: report.organiserId,
      details: {
        eventId,
        eventTitle: report.eventTitle,
        decision,
        feedback: feedback || "",
      },
      timestamp: serverNow,
    });

    // 4. Notify Organiser via notify() service
    if (report.organiserId) {
      const isApproved = decision === "APPROVED";
      await notify({
        userIds: [report.organiserId],
        type: isApproved ? "REPORT_APPROVED" : "REPORT_CHANGES_REQUESTED",
        title: isApproved ? "Post-Event Report Approved" : "Revisions Requested on Report",
        body: isApproved
          ? `Your institutional report for "${report.eventTitle}" has been approved and archived for accreditation.`
          : `Feedback on your report for "${report.eventTitle}": ${feedback || "Please review and resubmit."}`,
        link: `/faculty/events/${eventId}/report`,
        emailTemplate: isApproved ? "report-approved" : "report-changes-requested",
        emailData: {
          eventTitle: report.eventTitle,
          eventId,
          reason: feedback,
        },
        priority: "HIGH",
      });
    }

    return {
      success: true,
      eventId,
      status: targetStatus,
    };
  }
);
