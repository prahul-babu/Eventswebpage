import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled Cleanup: cleanupOldNotifications
 * Runs once every Sunday at 03:00 AM IST.
 * Deletes read notifications older than 60 days.
 */
export const cleanupOldNotifications = onSchedule(
  {
    schedule: "0 3 * * 0",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    console.log(`[cleanupOldNotifications] Purging read notifications created before: ${sixtyDaysAgo.toISOString()}`);

    // 1. Purge root notifications collection
    const oldRootNotifs = await db
      .collection("notifications")
      .where("read", "==", true)
      .where("createdAt", "<=", sixtyDaysAgo)
      .limit(500)
      .get();

    if (!oldRootNotifs.empty) {
      const batch = db.batch();
      oldRootNotifs.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      console.log(`[cleanupOldNotifications] Cleaned ${oldRootNotifs.size} root notifications.`);
    }

    // 2. Purge subcollection notifications/{uid}/items
    const oldSubItems = await db
      .collectionGroup("items")
      .where("read", "==", true)
      .where("createdAt", "<=", sixtyDaysAgo)
      .limit(500)
      .get();

    if (!oldSubItems.empty) {
      const batch = db.batch();
      oldSubItems.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      console.log(`[cleanupOldNotifications] Cleaned ${oldSubItems.size} subcollection items.`);
    }
  }
);
