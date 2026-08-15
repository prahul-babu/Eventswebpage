import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { renderEmailTemplate } from "./emailTemplates";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled Retry: retryFailedEmails
 * Runs every 30 minutes in Asia/Kolkata timezone.
 * Retries failed email entries up to 3 times before archiving.
 */
export const retryFailedEmails = onSchedule(
  {
    schedule: "*/30 * * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const failedSnap = await db
      .collection("failedEmails")
      .where("retryCount", "<", 3)
      .limit(50)
      .get();

    if (failedSnap.empty) {
      return;
    }

    console.log(`[retryFailedEmails] Attempting retries for ${failedSnap.size} failed email records.`);

    for (const doc of failedSnap.docs) {
      const data = doc.data();
      const currentRetry = data.retryCount || 0;

      try {
        const { subject, html } = renderEmailTemplate(data.template, {
          userEmail: data.recipientEmail,
          ...data.data,
        });

        // Re-queue to 'mail' collection
        await db.collection("mail").add({
          to: [data.recipientEmail],
          message: {
            subject,
            html,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          template: data.template,
          metadata: {
            retriedFrom: doc.id,
            retryNumber: currentRetry + 1,
          },
        });

        // On success, remove from failedEmails
        await doc.ref.delete();
        console.log(`[retryFailedEmails] Successfully retried and queued email for: ${data.recipientEmail}`);
      } catch (err: any) {
        console.warn(`[retryFailedEmails] Retry attempt ${currentRetry + 1} failed for ${data.recipientEmail}:`, err.message);
        await doc.ref.update({
          retryCount: currentRetry + 1,
          lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          lastError: err.message,
        });
      }
    }
  }
);
