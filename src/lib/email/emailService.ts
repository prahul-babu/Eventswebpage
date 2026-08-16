import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  renderEventUpdateEmailHtml,
  EventUpdateEmailData,
  renderAdminFacultyNotificationEmailHtml,
  AdminFacultyEmailData,
} from "./emailTemplates";

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Dispatch an Event Update Email to an attendee's institutional Outlook inbox
 */
export async function sendEventUpdateEmail(
  data: EventUpdateEmailData
): Promise<SendEmailResult> {
  try {
    const { subject, html } = renderEventUpdateEmailHtml(data);

    // 1. Queue to Firestore 'mail' collection (Firebase Trigger Email extension standard)
    const mailRef = collection(db, "mail");
    const docRef = await addDoc(mailRef, {
      to: [data.recipientEmail],
      message: {
        subject,
        html,
        text: `${data.updateSubject}\n\n${data.updateMessage}\n\nEvent: ${data.eventTitle}\nDate: ${data.eventDate}\nVenue: ${data.venueLocation}\nLink: ${data.eventLink}`,
      },
      createdAt: serverTimestamp(),
      metadata: {
        eventId: data.eventId,
        eventTitle: data.eventTitle,
        updateSubject: data.updateSubject,
        recipientEmail: data.recipientEmail,
        type: "EVENT_UPDATE",
      },
    });

    return {
      success: true,
      messageId: docRef.id,
    };
  } catch (error: any) {
    console.error(`[emailService] Failed to dispatch email to ${data.recipientEmail}:`, error);
    return {
      success: false,
      error: error.message || "Failed to dispatch email",
    };
  }
}

/**
 * Dispatch an Admin Update Email to a faculty member's official Outlook inbox
 */
export async function sendAdminFacultyNotificationEmail(
  data: AdminFacultyEmailData
): Promise<SendEmailResult> {
  try {
    const { subject, html } = renderAdminFacultyNotificationEmailHtml(data);

    const mailRef = collection(db, "mail");
    const docRef = await addDoc(mailRef, {
      to: [data.recipientEmail],
      message: {
        subject,
        html,
        text: `${data.subject}\n\n${data.message}\n\nRecipient: ${data.recipientName} (${data.recipientEmail})\nDepartment: ${data.department || "B.Tech Faculty"}\n\nThis notification was sent by the University Event Hub administration.`,
      },
      createdAt: serverTimestamp(),
      metadata: {
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
        subject: data.subject,
        type: "ADMIN_FACULTY_NOTIFICATION",
      },
    });

    return {
      success: true,
      messageId: docRef.id,
    };
  } catch (error: any) {
    console.error(`[emailService] Failed to dispatch admin email to ${data.recipientEmail}:`, error);
    return {
      success: false,
      error: error.message || "Failed to dispatch email",
    };
  }
}
