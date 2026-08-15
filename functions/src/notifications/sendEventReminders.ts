import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { notify } from "./service";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Scheduler Cron: sendEventReminders
 * Runs every hour at minute 0 in Asia/Kolkata timezone.
 * Dispatches 24-hour and 1-hour event reminders to confirmed attendees.
 */
export const sendEventReminders = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const now = new Date();
    console.log(`[sendEventReminders] Running reminder sweep at: ${now.toISOString()}`);

    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // 1. Sweep for 24-Hour Reminders (events between 23h and 25h from now)
    const snap24h = await db
      .collection("events")
      .where("status", "in", ["PUBLISHED", "ONGOING"])
      .where("startAt", ">=", in23Hours)
      .where("startAt", "<=", in25Hours)
      .get();

    for (const doc of snap24h.docs) {
      const eventData = doc.data();
      if (eventData.sentReminders?.reminder24h) {
        continue;
      }

      console.log(`[sendEventReminders] Dispatching 24h reminders for: ${eventData.title} (${doc.id})`);

      await notify({
        eventRegistrants: doc.id,
        type: "EVENT_REMINDER_24H",
        title: `Tomorrow: "${eventData.title}" starts in 24 hours!`,
        body: `Reminder: ${eventData.title} starts tomorrow at ${eventData.venueLocation}. Make sure to bring your digital ticket pass.`,
        link: `/events/${doc.id}`,
        emailTemplate: "event-reminder-24h",
        emailData: {
          eventTitle: eventData.title,
          venue: eventData.venueLocation,
          eventTime: eventData.startAt?.toDate ? eventData.startAt.toDate().toLocaleString() : "Tomorrow",
        },
        priority: "NORMAL",
      });

      await doc.ref.set(
        {
          sentReminders: {
            reminder24h: true,
            reminder24hSentAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    }

    // 2. Sweep for 1-Hour Reminders (events between 1h and 2h from now)
    const snap1h = await db
      .collection("events")
      .where("status", "in", ["PUBLISHED", "ONGOING"])
      .where("startAt", ">=", in1Hour)
      .where("startAt", "<=", in2Hours)
      .get();

    for (const doc of snap1h.docs) {
      const eventData = doc.data();
      if (eventData.sentReminders?.reminder1h) {
        continue;
      }

      console.log(`[sendEventReminders] Dispatching 1h reminders for: ${eventData.title} (${doc.id})`);

      await notify({
        eventRegistrants: doc.id,
        type: "EVENT_REMINDER_1H",
        title: `Starting Soon: "${eventData.title}" in 1 hour!`,
        body: `${eventData.title} begins in 1 hour at ${eventData.venueLocation}. Please proceed to the check-in gate.`,
        link: `/events/${doc.id}`,
        emailTemplate: "event-reminder-1h",
        emailData: {
          eventTitle: eventData.title,
          venue: eventData.venueLocation,
        },
        priority: "URGENT",
      });

      await doc.ref.set(
        {
          sentReminders: {
            reminder1h: true,
            reminder1hSentAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    }
  }
);
