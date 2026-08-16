import { format } from "date-fns";

export interface EventUpdateEmailData {
  recipientName: string;
  recipientEmail: string;
  eventTitle: string;
  eventId: string;
  updateSubject: string;
  updateMessage: string;
  eventDate?: Date | string;
  venueLocation?: string;
  senderName?: string;
  senderRole?: string;
  eventLink?: string;
}

/**
 * Render official responsive HTML email for Event Updates
 */
export function renderEventUpdateEmailHtml(data: EventUpdateEmailData): {
  subject: string;
  html: string;
} {
  const formattedDate = data.eventDate
    ? typeof data.eventDate === "string"
      ? data.eventDate
      : format(data.eventDate, "MMMM dd, yyyy • h:mm a")
    : "Campus Event Date TBA";

  const appUrl =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://theapolloeventhub.web.app";

  const directLink = data.eventLink || `${appUrl}/events/${data.eventId}`;
  const emailSubject = `[Event Update] ${data.updateSubject} – ${data.eventTitle}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.updateSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- University Teal / Indigo Header -->
          <tr>
            <td style="background-color: #004D61; padding: 24px 32px; text-align: center;">
              <div style="color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">THE APOLLO UNIVERSITY</div>
              <div style="color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.3px;">Apollo Event Hub • Student Notification</div>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 32px;">
              <div style="display: inline-block; background-color: #E0F3F7; color: #007A99; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; margin-bottom: 12px;">
                CONFIRMED ATTENDEE UPDATE
              </div>

              <h1 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 8px 0; line-height: 1.3;">
                ${data.updateSubject}
              </h1>

              <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0;">
                Regarding your registration for: <strong style="color: #004D61;">${data.eventTitle}</strong>
              </p>

              <!-- Announcement Card -->
              <div style="background-color: #f8fafc; border-left: 4px solid #007A99; padding: 18px 20px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
                <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${data.updateMessage}</div>
              </div>

              <!-- Event Details Quick Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12px;">
                    <strong style="color: #64748b; text-transform: uppercase; font-size: 10px; display: block;">Event Date & Time</strong>
                    <span style="color: #0f172a; font-weight: 600;">${formattedDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 12px;">
                    <strong style="color: #64748b; text-transform: uppercase; font-size: 10px; display: block;">Venue / Location</strong>
                    <span style="color: #0f172a; font-weight: 600;">${data.venueLocation || "Main University Campus"}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 12px;">
                    <strong style="color: #64748b; text-transform: uppercase; font-size: 10px; display: block;">Dispatched By</strong>
                    <span style="color: #0f172a; font-weight: 600;">${data.senderName || "Faculty Coordinator"} (${data.senderRole || "Faculty"})</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="margin: 28px 0; text-align: center;">
                <a href="${directLink}" style="background-color: #004D61; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  View Event &amp; Full Updates &rarr;
                </a>
              </div>

              <!-- Footer Notice -->
              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.5;">
                <p style="margin: 0 0 6px 0;">This official update was sent to <strong>${data.recipientEmail}</strong> because you are registered for this event.</p>
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">The Apollo University • School of Technology • B.Tech Event Hub</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject: emailSubject, html };
}
