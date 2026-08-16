import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { renderEventUpdateEmailHtml, EventUpdateEmailData } from "./emailTemplates";

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
