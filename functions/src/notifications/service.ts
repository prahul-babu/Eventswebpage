import * as admin from "firebase-admin";
import { EmailTemplateType, renderEmailTemplate } from "./emailTemplates";
import type { NotificationType, UserRole } from "../../../src/types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface NotifyOptions {
  userIds?: string[];
  role?: UserRole;
  eventRegistrants?: string; // eventId
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  emailTemplate?: EmailTemplateType;
  emailData?: Record<string, any>;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}

/**
 * Map notification type to user preference category
 */
function getPrefCategoryForType(type: NotificationType): "eventUpdates" | "registrationAndPayments" | "approvalsAndAccess" | "reminders" | "announcements" {
  switch (type) {
    case "REGISTRATION_CONFIRMED":
    case "PAYMENT_SUCCESS":
    case "PAYMENT_REFUNDED":
      return "registrationAndPayments";

    case "ROLE_CHANGED":
    case "ACCESS_REQUESTED":
    case "ACCESS_APPROVED":
    case "ACCESS_REJECTED":
    case "EVENT_APPROVED":
    case "EVENT_REJECTED":
    case "REPORT_APPROVED":
    case "REPORT_CHANGES_REQUESTED":
      return "approvalsAndAccess";

    case "EVENT_REMINDER_24H":
    case "EVENT_REMINDER_1H":
    case "REPORT_DUE":
      return "reminders";

    case "EVENT_CANCELLED":
    case "WAITLIST_PROMOTED":
    case "EVENT_UPDATED":
    default:
      return "eventUpdates";
  }
}

/**
 * Central Notification Service
 * Dispatches in-app notifications, queues responsive emails, and handles FCM web push.
 */
export async function notify(options: NotifyOptions): Promise<{ success: boolean; deliveredCount: number }> {
  try {
    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    const priority = options.priority || "NORMAL";

    // 1. Resolve Recipient User IDs
    let targetUids: string[] = [];

    if (options.userIds && options.userIds.length > 0) {
      targetUids = [...options.userIds];
    } else if (options.role) {
      const usersSnap = await db
        .collection("users")
        .where("role", "==", options.role)
        .where("status", "==", "ACTIVE")
        .get();
      targetUids = usersSnap.docs.map((d) => d.id);
    } else if (options.eventRegistrants) {
      const regsSnap = await db
        .collection("registrations")
        .where("eventId", "==", options.eventRegistrants)
        .where("status", "==", "CONFIRMED")
        .get();
      targetUids = regsSnap.docs.map((d) => d.data().userId).filter(Boolean);
    }

    if (targetUids.length === 0) {
      return { success: true, deliveredCount: 0 };
    }

    // Deduplicate target UIDs
    const uniqueUids = Array.from(new Set(targetUids));

    // 2. Fetch User Documents to check email & notification preferences
    const userDocs = await Promise.all(
      uniqueUids.map(async (uid) => {
        try {
          const snap = await db.collection("users").doc(uid).get();
          return snap.exists ? { uid, ...snap.data() } : null;
        } catch {
          return null;
        }
      })
    );

    const validUsers = userDocs.filter(Boolean) as any[];
    const category = getPrefCategoryForType(options.type);

    // 3. Write in-app notifications in batch (both notifications/{uid}/items and notifications/)
    const BATCH_SIZE = 250;
    for (let i = 0; i < validUsers.length; i += BATCH_SIZE) {
      const chunk = validUsers.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const user of chunk) {
        // Subcollection write: notifications/{uid}/items/{itemId}
        const itemRef = db.collection("notifications").doc(user.uid).collection("items").doc();
        batch.set(itemRef, {
          type: options.type,
          title: options.title,
          body: options.body,
          link: options.link || null,
          read: false,
          priority,
          createdAt: serverNow,
        });

        // Universal collection write: notifications/{notifId} for backward compatibility
        const notifRef = db.collection("notifications").doc();
        batch.set(notifRef, {
          recipientUid: user.uid,
          recipientEmail: user.email,
          type: options.type,
          title: options.title,
          message: options.body,
          link: options.link || null,
          read: false,
          priority,
          createdAt: serverNow,
        });
      }

      await batch.commit();
    }

    // 4. Queue Emails if template provided & user preferences allow
    if (options.emailTemplate) {
      for (const user of validUsers) {
        const prefs = user.notificationPrefs || {};
        const isEmailAllowed = prefs[category] !== false; // default true

        if (user.email && isEmailAllowed) {
          try {
            const emailData = {
              recipientName: user.displayName || "Apollo Member",
              userEmail: user.email,
              ...options.emailData,
            };

            const { subject, html } = renderEmailTemplate(options.emailTemplate, emailData);

            // Write to Firebase 'mail' collection (Trigger Email extension queue)
            await db.collection("mail").add({
              to: [user.email],
              message: {
                subject,
                html,
              },
              createdAt: serverNow,
              template: options.emailTemplate,
              metadata: {
                recipientUid: user.uid,
                type: options.type,
              },
            });
          } catch (err: any) {
            console.error(`[notify] Failed to queue email for ${user.email}:`, err.message);
            // Fault tolerance: record in failedEmails collection for scheduled retry
            await db.collection("failedEmails").add({
              recipientEmail: user.email,
              recipientUid: user.uid,
              template: options.emailTemplate,
              data: options.emailData || {},
              error: err.message,
              retryCount: 0,
              createdAt: serverNow,
            });
          }
        }
      }
    }

    // 5. Web Push FCM notifications
    const allFcmTokens: string[] = [];
    for (const user of validUsers) {
      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        allFcmTokens.push(...user.fcmTokens);
      }
    }

    if (allFcmTokens.length > 0) {
      try {
        await admin.messaging().sendEachForMulticast({
          tokens: allFcmTokens,
          notification: {
            title: options.title,
            body: options.body,
          },
          data: {
            link: options.link || "/",
            type: options.type,
          },
        });
      } catch (fcmErr: any) {
        console.warn("[notify] FCM Multicast note:", fcmErr.message);
      }
    }

    return { success: true, deliveredCount: validUsers.length };
  } catch (error: any) {
    console.error("[notify] Notification engine exception:", error.message);
    return { success: false, deliveredCount: 0 };
  }
}
