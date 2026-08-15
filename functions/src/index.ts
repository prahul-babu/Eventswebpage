import { onCall, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type { HealthCheckResponse } from "../../src/types";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Health check HTTPS callable function (2nd gen)
 * Region: asia-south1
 */
export const healthCheck = onCall(
  { region: "asia-south1" },
  async (_request: CallableRequest): Promise<HealthCheckResponse> => {
    return {
      ok: true,
      ts: new Date().toISOString(),
    };
  }
);

// Module 3: Authentication & Role Resolution Callables
export { resolveUser } from "./auth/resolveUser";
export { requestAccess } from "./auth/requestAccess";
export { setUserRole } from "./auth/setUserRole";

// Module 6: Event Registration & Cancellation Callables
export { createRegistration } from "./registrations/createRegistration";
export { cancelRegistration } from "./registrations/cancelRegistration";

// Module 7: Payments, Webhook, Refunds & Expiration
export { createPaymentOrder } from "./payments/createPaymentOrder";
export { verifyPayment } from "./payments/verifyPayment";
export { razorpayWebhook } from "./payments/razorpayWebhook";
export { expireStalePayments } from "./payments/expireStalePayments";
export { initiateRefund } from "./payments/initiateRefund";

// Module 8: Faculty Event Workflow Callables
export { submitEventForApproval } from "./events/submitEventForApproval";
export { withdrawEvent } from "./events/withdrawEvent";

// Module 9: Admin Approval & Event Lifecycle Workflow
export { approveEvent } from "./events/approveEvent";
export { rejectEvent } from "./events/rejectEvent";
export { bulkApproveEvents } from "./events/bulkApproveEvents";
export { updateEventStatuses } from "./events/updateEventStatuses";

// Module 10: Post-Event Reporting Callables
export { submitEventReport } from "./reports/submitEventReport";
export { reviewEventReport } from "./reports/reviewEventReport";

// Module 11: Admin Console & Roster Import Callables
export { importRosterAllowlist } from "./admin/importRosterAllowlist";

// Module 12: Notification & Email Schedulers
export { sendEventReminders } from "./notifications/sendEventReminders";
export { cleanupOldNotifications } from "./notifications/cleanupOldNotifications";
export { retryFailedEmails } from "./notifications/retryFailedEmails";

// Module 13: Attendance & Precomputed Analytics
export { checkInAttendee } from "./events/checkInAttendee";
export { computeDailyAnalytics } from "./analytics/computeDailyAnalytics";

// Module 14: Disaster Recovery & Automated Daily Backups
export { backupFirestore } from "./admin/backupFirestore";
