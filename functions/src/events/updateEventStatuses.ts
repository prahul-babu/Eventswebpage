import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled Cloud Function running every 10 minutes in timezone Asia/Kolkata
 * Automatically transitions:
 * 1. PUBLISHED -> ONGOING when startAt <= now
 * 2. ONGOING -> COMPLETED when endAt <= now (and sets reportStatus: 'NOT_STARTED', notifies organiser)
 */
export const updateEventStatuses = onSchedule(
  {
    schedule: "*/10 * * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    console.log("⏰ Running event lifecycle auto-transition updateEventStatuses...");
    const now = new Date();
    const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
    const serverNow = admin.firestore.FieldValue.serverTimestamp();

    // 1. Transition PUBLISHED -> ONGOING (when startAt <= now and endAt > now)
    const publishedSnap = await db
      .collection("events")
      .where("status", "==", "PUBLISHED")
      .where("startAt", "<=", nowTimestamp)
      .get();

    for (const docSnap of publishedSnap.docs) {
      const event = docSnap.data();
      const endAt = event.endAt?.toDate ? event.endAt.toDate() : new Date(event.endAt);

      if (endAt > now) {
        await docSnap.ref.update({
          status: "ONGOING",
          updatedAt: serverNow,
        });
        console.log(`[updateEventStatuses] Event ${docSnap.id} ("${event.title}") -> ONGOING`);
      }
    }

    // 2. Transition ONGOING / PUBLISHED -> COMPLETED (when endAt <= now)
    const activeSnap = await db
      .collection("events")
      .where("status", "in", ["PUBLISHED", "ONGOING"])
      .where("endAt", "<=", nowTimestamp)
      .get();

    for (const docSnap of activeSnap.docs) {
      const event = docSnap.data();

      await docSnap.ref.update({
        status: "COMPLETED",
        reportStatus: "NOT_STARTED",
        completedAt: serverNow,
        updatedAt: serverNow,
      });

      console.log(`[updateEventStatuses] Event ${docSnap.id} ("${event.title}") -> COMPLETED`);

      // Notify Organiser that an event outcome report is now due
      if (event.organiserId) {
        await db.collection("notifications").add({
          recipientUid: event.organiserId,
          type: "REPORT_DUE",
          title: "Event Concluded — Report Due",
          message: `"${event.title}" has completed. Please compile attendance records and submit your post-event report.`,
          data: {
            eventId: docSnap.id,
            link: "/faculty/reports",
          },
          read: false,
          createdAt: serverNow,
        });
      }
    }

    console.log("✅ updateEventStatuses cycle finished successfully.");
  }
);
