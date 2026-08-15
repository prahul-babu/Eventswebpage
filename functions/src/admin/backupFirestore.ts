import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Scheduled Cron: backupFirestore
 * Daily automated backup of Firestore collections to Cloud Storage bucket.
 * Runs at 02:00 AM IST daily.
 */
export const backupFirestore = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT || "apollo-event-hub";
    const bucket = `gs://${projectId}-firestore-backups`;

    console.log(`[backupFirestore] Triggering scheduled daily backup to ${bucket}...`);

    try {
      const client = new admin.firestore.v1.FirestoreAdminClient();
      const databaseName = client.databasePath(projectId, "(default)");

      const [response] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        collectionIds: [], // All collections
      });

      console.log(`[backupFirestore] Backup operation initiated: ${response.name}`);
    } catch (err: any) {
      console.error("[backupFirestore] Automated backup failed:", err.message);
    }
  }
);
