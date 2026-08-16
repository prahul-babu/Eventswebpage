import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { sendAdminFacultyNotificationEmail } from "@/lib/email/emailService";
import { toast } from "sonner";

export interface FacultyRecipient {
  uid?: string;
  name: string;
  email: string;
  department?: string;
  employeeId?: string;
}

export interface SendAdminFacultyNotificationParams {
  recipients: FacultyRecipient[];
  subject: string;
  message: string;
  eventContext?: {
    eventId: string;
    eventTitle: string;
  };
  channels?: {
    inApp?: boolean;
    email?: boolean;
  };
  priority?: "NORMAL" | "HIGH" | "URGENT";
}

export interface AdminFacultyNotificationResult {
  success: boolean;
  recipientCount: number;
  inAppCount: number;
  emailsSent: number;
  emailsFailed: number;
}

/**
 * Mutation Hook for Administrator to dispatch official updates/notices to Faculty Members
 */
export function useSendAdminFacultyNotification() {
  const queryClient = useQueryClient();

  return useMutation<AdminFacultyNotificationResult, Error, SendAdminFacultyNotificationParams>({
    mutationFn: async (params) => {
      const {
        recipients,
        subject,
        message,
        eventContext,
        channels = { inApp: true, email: true },
        priority = "HIGH",
      } = params;

      if (!auth.currentUser) {
        throw new Error("Administrative authentication required to send faculty updates.");
      }

      if (!recipients || recipients.length === 0) {
        throw new Error("Please specify at least one faculty recipient.");
      }

      if (!subject.trim()) {
        throw new Error("Notification subject is required.");
      }

      if (!message.trim()) {
        throw new Error("Notification message content is required.");
      }

      const adminUid = auth.currentUser.uid;
      const adminEmail = auth.currentUser.email || "admin@apollouniversity.edu.in";
      const adminName = auth.currentUser.displayName || "University Administration";

      let inAppCount = 0;
      let emailsSent = 0;
      let emailsFailed = 0;

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        let targetUid = recipient.uid;
        const targetEmail = recipient.email.toLowerCase().trim();

        // 1. If UID is missing, attempt to resolve UID from users collection by email
        if (!targetUid && targetEmail) {
          try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", targetEmail));
            const userSnap = await getDocs(q);
            if (!userSnap.empty) {
              targetUid = userSnap.docs[0].id;
            }
          } catch (e) {
            console.warn(`[useSendAdminFacultyNotification] UID resolution failed for ${targetEmail}:`, e);
          }
        }

        const effectiveRecipientUid = targetUid || targetEmail;
        const notifId = `notif_admin_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

        // 2. Dispatch In-App Notification (Stored in top-level 'notifications' & user items)
        if (channels.inApp !== false) {
          try {
            const notifDocRef = doc(db, "notifications", notifId);
            const notifPayload = {
              id: notifId,
              recipientUid: effectiveRecipientUid,
              recipientUserId: effectiveRecipientUid,
              recipientEmail: targetEmail,
              recipientRole: "faculty",
              senderUid: adminUid,
              senderUserId: adminUid,
              senderName: "University Event Hub Administration",
              senderRole: "admin",
              type: "ADMIN_FACULTY_UPDATE",
              title: subject.trim(),
              message: message.trim(),
              body: message.trim(),
              eventId: eventContext?.eventId || null,
              eventName: eventContext?.eventTitle || null,
              link: eventContext?.eventId ? `/faculty/events` : `/faculty/events`,
              data: {
                source: "ADMIN_PORTAL",
                eventId: eventContext?.eventId,
                eventTitle: eventContext?.eventTitle,
                senderAdminEmail: adminEmail,
                senderAdminName: adminName,
              },
              read: false,
              isRead: false,
              priority,
              createdAt: serverTimestamp(),
            };

            await setDoc(notifDocRef, notifPayload);

            // Also persist in subcollection if target UID is valid
            if (targetUid) {
              const subDocRef = doc(db, "notifications", targetUid, "items", notifId);
              await setDoc(subDocRef, notifPayload);
            }

            inAppCount++;
          } catch (notifErr) {
            console.error(`[useSendAdminFacultyNotification] In-app notification error for ${targetEmail}:`, notifErr);
          }
        }

        // 3. Dispatch Official Email to Faculty Outlook Inbox
        if (channels.email !== false && targetEmail) {
          try {
            const emailResult = await sendAdminFacultyNotificationEmail({
              recipientName: recipient.name || "Faculty Member",
              recipientEmail: targetEmail,
              subject: subject.trim(),
              message: message.trim(),
              department: recipient.department,
              eventTitle: eventContext?.eventTitle,
              actionLink: eventContext?.eventId ? undefined : undefined,
            });

            if (emailResult.success) {
              emailsSent++;
            } else {
              emailsFailed++;
            }
          } catch (emailErr) {
            console.error(`[useSendAdminFacultyNotification] Email dispatch error for ${targetEmail}:`, emailErr);
            emailsFailed++;
          }
        }
      }

      // 4. Record Audit Log Entry
      try {
        await addDoc(collection(db, "audit_logs"), {
          action: "ADMIN_FACULTY_NOTIFICATION_DISPATCHED",
          actorUid: adminUid,
          actorEmail: adminEmail,
          actorRole: "admin",
          targetUid: recipients.map((r) => r.uid || r.email).join(", "),
          details: {
            subject: subject.trim(),
            recipientsCount: recipients.length,
            recipientEmails: recipients.map((r) => r.email),
            inAppCount,
            emailsSent,
            emailsFailed,
            eventId: eventContext?.eventId || null,
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("[useSendAdminFacultyNotification] Audit log error:", auditErr);
      }

      return {
        success: true,
        recipientCount: recipients.length,
        inAppCount,
        emailsSent,
        emailsFailed,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit_logs"] });

      toast.success("Faculty Notification Dispatched", {
        description: `Successfully sent in-app update to ${result.inAppCount} faculty member(s). Email delivery queued.`,
      });
    },
    onError: (err) => {
      toast.error("Failed to Send Faculty Notification", {
        description: err.message || "An unexpected error occurred.",
      });
    },
  });
}
