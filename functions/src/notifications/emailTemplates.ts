export type EmailTemplateType =
  | "access-requested-admin"
  | "access-approved"
  | "access-rejected"
  | "event-submitted-admin"
  | "event-approved"
  | "event-rejected"
  | "registration-confirmed"
  | "payment-receipt"
  | "event-reminder-24h"
  | "event-reminder-1h"
  | "event-cancelled"
  | "refund-processed"
  | "report-due"
  | "report-approved"
  | "report-changes-requested"
  | "waitlist-promoted";

interface BaseEmailData {
  recipientName?: string;
  [key: string]: any;
}

/**
 * Shared Responsive Email Shell with The Apollo University Indigo Brand Header
 */
function wrapEmailHtml(content: {
  title: string;
  bodyHtml: string;
  ctaText?: string;
  ctaLink?: string;
  metaHtml?: string;
}): string {
  const ctaButtonHtml =
    content.ctaText && content.ctaLink
      ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${content.ctaLink}" style="background-color: #312E81; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${content.ctaText} &rarr;
        </a>
      </div>`
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- University Indigo Header -->
          <tr>
            <td style="background-color: #312E81; padding: 24px 32px; text-align: center;">
              <div style="color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">THE APOLLO UNIVERSITY</div>
              <div style="color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.3px;">Apollo Event Hub</div>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.3;">
                ${content.title}
              </h1>

              <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                ${content.bodyHtml}
              </div>

              ${content.metaHtml || ""}

              ${ctaButtonHtml}

              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.5;">
                Need assistance? Contact our Directorate of Student & Academic Affairs at <a href="mailto:events@apollouniversity.edu.in" style="color: #4f46e5; text-decoration: none;">events@apollouniversity.edu.in</a>.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0 0 6px 0;">&copy; ${new Date().getFullYear()} The Apollo University. All rights reserved.</p>
              <p style="margin: 0;">
                <a href="https://events.apollouniversity.edu.in/profile/notifications" style="color: #64748b; text-decoration: underline;">Manage Email Preferences</a> &bull; 
                <a href="https://events.apollouniversity.edu.in" style="color: #64748b; text-decoration: underline;">Campus Portal</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Render HTML email for any template type
 */
export function renderEmailTemplate(
  template: EmailTemplateType,
  data: BaseEmailData
): { subject: string; html: string } {
  const portalBaseUrl = "https://events.apollouniversity.edu.in";

  switch (template) {
    case "access-requested-admin":
      return {
        subject: `[Apollo Event Hub] New Access Request: ${data.userName || "Applicant"} (${data.requestedRole || "student"})`,
        html: wrapEmailHtml({
          title: "New Identity Onboarding Request",
          bodyHtml: `<p>A new applicant has verified via Microsoft SSO and submitted an access request awaiting administrative clearance:</p>
          <ul style="padding-left: 20px; margin: 12px 0;">
            <li><strong>Applicant:</strong> ${data.userName || "N/A"} (${data.userEmail || "N/A"})</li>
            <li><strong>Requested Role:</strong> ${data.requestedRole || "student"}</li>
            <li><strong>Department:</strong> ${data.department || "N/A"}</li>
            <li><strong>Identifier:</strong> ${data.rollNumber || data.employeeId || "N/A"}</li>
          </ul>`,
          ctaText: "Review Access Queue",
          ctaLink: `${portalBaseUrl}/admin/users/requests`,
        }),
      };

    case "access-approved":
      return {
        subject: "Your Apollo University Faculty Access Has Been Approved",
        html: wrapEmailHtml({
          title: "Faculty Access Approved",
          bodyHtml: `<p>Dear ${data.recipientName || "Faculty Member"},</p>
          <p>Your faculty access request for the <strong>Apollo University Event Hub</strong> has been approved by the administrator.</p>
          <p>You can now sign in to the Faculty Portal.</p>
          <p style="margin-top: 16px;"><strong>Your registered email:</strong> ${data.recipientEmail || ""}</p>
          <p>Please use the password you created during registration.</p>`,
          ctaText: "Login here",
          ctaLink: `https://theapolloeventhub.web.app/login`,
        }),
      };

    case "access-rejected":
      return {
        subject: "Apollo Event Hub — Access Request Status",
        html: wrapEmailHtml({
          title: "Access Request Notice",
          bodyHtml: `<p>Dear ${data.recipientName || "Applicant"},</p>
          <p>Your access request could not be approved at this time for the following reason:</p>
          <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #9f1239;">
            ${data.reason || "Credentials could not be verified against the university roster."}
          </div>
          <p>Please contact your department coordinator or dean's office for assistance.</p>`,
          ctaText: "Check Account Status",
          ctaLink: `${portalBaseUrl}/login`,
        }),
      };

    case "event-submitted-admin":
      return {
        subject: `[Event Review] New Proposal: "${data.eventTitle}"`,
        html: wrapEmailHtml({
          title: "New Event Proposal Submitted",
          bodyHtml: `<p>A faculty organiser has submitted a new event proposal awaiting administrative approval:</p>
          <ul style="padding-left: 20px; margin: 12px 0;">
            <li><strong>Event Title:</strong> ${data.eventTitle}</li>
            <li><strong>Organiser:</strong> ${data.organiserName} (${data.department})</li>
            <li><strong>Event Date:</strong> ${data.eventDate || "Upcoming"}</li>
            <li><strong>Venue:</strong> ${data.venue || "Campus Venue"}</li>
          </ul>`,
          ctaText: "Review Event Dossier",
          ctaLink: `${portalBaseUrl}/admin/approvals/${data.eventId}`,
        }),
      };

    case "event-approved":
      return {
        subject: `Event Approved & Published: "${data.eventTitle}"`,
        html: wrapEmailHtml({
          title: "Congratulations! Your Event is Live",
          bodyHtml: `<p>Dear ${data.recipientName || "Organiser"},</p>
          <p>Your event proposal <strong>"${data.eventTitle}"</strong> has received administrative clearance and is now published on the student discovery feed.</p>`,
          ctaText: "View Live Event Page",
          ctaLink: `${portalBaseUrl}/events/${data.eventId}`,
        }),
      };

    case "event-rejected":
      return {
        subject: `Event Revision / Clearance Notice: "${data.eventTitle}"`,
        html: wrapEmailHtml({
          title: "Event Proposal Decision",
          bodyHtml: `<p>Dear ${data.recipientName || "Organiser"},</p>
          <p>Your event proposal <strong>"${data.eventTitle}"</strong> was not cleared with the following reviewer feedback:</p>
          <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #854d0e;">
            ${data.reason || "Please adjust event timings or venue requirements."}
          </div>`,
          ctaText: "Edit Proposal in Portal",
          ctaLink: `${portalBaseUrl}/faculty/events/${data.eventId}/edit`,
        }),
      };

    case "registration-confirmed":
      return {
        subject: `Booking Confirmed: "${data.eventTitle}" — Pass #${data.ticketCode || "TKT"}`,
        html: wrapEmailHtml({
          title: "Your Event Ticket Pass is Ready",
          bodyHtml: `<p>Dear ${data.recipientName || "Student"},</p>
          <p>Your registration for <strong>"${data.eventTitle}"</strong> has been confirmed.</p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; margin: 20px 0; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase;">Official E-Pass Ticket Code</div>
            <div style="font-size: 24px; font-weight: 900; color: #14532d; letter-spacing: 2px; margin: 8px 0; font-family: monospace;">${data.ticketCode}</div>
            <div style="font-size: 12px; color: #15803d;">Date: ${data.eventDate || "TBA"} &bull; Venue: ${data.venue || "Campus Venue"}</div>
          </div>
          <p>Please present this digital pass or QR code at the check-in gate upon arrival.</p>`,
          ctaText: "View & Download Ticket Pass",
          ctaLink: `${portalBaseUrl}/tickets/${data.registrationId}`,
        }),
      };

    case "payment-receipt":
      return {
        subject: `Payment Receipt: ₹${data.amount || 0} for "${data.eventTitle}"`,
        html: wrapEmailHtml({
          title: "Payment Receipt & Invoice",
          bodyHtml: `<p>Dear ${data.recipientName || "Attendee"},</p>
          <p>Thank you for your payment. Your transaction has been settled successfully via Razorpay.</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span><strong>Amount Paid:</strong></span>
              <span>₹${data.amount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span><strong>Order ID:</strong></span>
              <span style="font-family: monospace;">${data.orderId}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Payment ID:</strong></span>
              <span style="font-family: monospace;">${data.paymentId}</span>
            </div>
          </div>`,
          ctaText: "Download PDF Receipt",
          ctaLink: `${portalBaseUrl}/tickets/${data.registrationId}`,
        }),
      };

    case "event-reminder-24h":
      return {
        subject: `Tomorrow: "${data.eventTitle}" starts in 24 Hours!`,
        html: wrapEmailHtml({
          title: "Event Reminder — 24 Hours to Go",
          bodyHtml: `<p>Dear ${data.recipientName || "Attendee"},</p>
          <p>This is a quick reminder that <strong>"${data.eventTitle}"</strong> is taking place tomorrow.</p>
          <p><strong>Venue:</strong> ${data.venue || "Campus"}<br><strong>Time:</strong> ${data.eventTime || "Scheduled Time"}</p>`,
          ctaText: "Access Digital Pass",
          ctaLink: `${portalBaseUrl}/tickets/${data.registrationId}`,
        }),
      };

    case "event-reminder-1h":
      return {
        subject: `Starting Soon: "${data.eventTitle}" in 1 Hour!`,
        html: wrapEmailHtml({
          title: "Event Starting in 1 Hour",
          bodyHtml: `<p>Dear ${data.recipientName || "Attendee"},</p>
          <p><strong>"${data.eventTitle}"</strong> will begin in approximately 1 hour at <strong>${data.venue || "Campus Venue"}</strong>.</p>
          <p>Have your digital ticket pass ready for entry check-in.</p>`,
          ctaText: "Open Ticket Pass",
          ctaLink: `${portalBaseUrl}/tickets/${data.registrationId}`,
        }),
      };

    case "event-cancelled":
      return {
        subject: `Important: Event Cancellation Notice — "${data.eventTitle}"`,
        html: wrapEmailHtml({
          title: "Event Cancelled",
          bodyHtml: `<p>Dear ${data.recipientName || "Attendee"},</p>
          <p>We regret to inform you that <strong>"${data.eventTitle}"</strong> scheduled for ${data.eventDate || "upcoming"} has been cancelled.</p>
          <p>If you paid a registration fee, an automated refund has been initiated to your original payment method.</p>`,
          ctaText: "Browse Other Events",
          ctaLink: `${portalBaseUrl}/events`,
        }),
      };

    case "refund-processed":
      return {
        subject: `Refund Processed: ₹${data.amount || 0} for "${data.eventTitle}"`,
        html: wrapEmailHtml({
          title: "Refund Initiated",
          bodyHtml: `<p>Dear ${data.recipientName || "Attendee"},</p>
          <p>A refund of <strong>₹${data.amount || 0}</strong> for your registration on <strong>"${data.eventTitle}"</strong> has been processed.</p>
          <p>Funds will reflect in your account within 5-7 working days as per standard banking protocol.</p>`,
          ctaText: "View My Registrations",
          ctaLink: `${portalBaseUrl}/my-registrations`,
        }),
      };

    case "report-due":
      return {
        subject: `Action Required: Submit Post-Event Report for "${data.eventTitle}"`,
        html: wrapEmailHtml({
          title: "Post-Event Institutional Report Due",
          bodyHtml: `<p>Dear ${data.recipientName || "Faculty Organiser"},</p>
          <p>Your event <strong>"${data.eventTitle}"</strong> has concluded. Please compile and submit your 7-section post-event outcome report for NAAC/NBA accreditation.</p>`,
          ctaText: "Complete Report Builder",
          ctaLink: `${portalBaseUrl}/faculty/events/${data.eventId}/report`,
        }),
      };

    case "report-approved":
      return {
        subject: `Accreditation Clearance Granted: "${data.eventTitle}" Report`,
        html: wrapEmailHtml({
          title: "Post-Event Report Approved & Archived",
          bodyHtml: `<p>Dear ${data.recipientName || "Organiser"},</p>
          <p>Your institutional post-event report for <strong>"${data.eventTitle}"</strong> has been officially approved and archived into the university accreditation repository.</p>`,
          ctaText: "Download Official Report PDF",
          ctaLink: `${portalBaseUrl}/faculty/reports`,
        }),
      };

    case "report-changes-requested":
      return {
        subject: `Revisions Requested: "${data.eventTitle}" Post-Event Report`,
        html: wrapEmailHtml({
          title: "Report Revision Required",
          bodyHtml: `<p>Dear ${data.recipientName || "Organiser"},</p>
          <p>The academic administration has reviewed your report for <strong>"${data.eventTitle}"</strong> and requested revisions:</p>
          <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #854d0e;">
            ${data.reason || "Please update attendance sheets and itemize expenses."}
          </div>`,
          ctaText: "Edit Report in Portal",
          ctaLink: `${portalBaseUrl}/faculty/events/${data.eventId}/report`,
        }),
      };

    case "waitlist-promoted":
      return {
        subject: `Seat Available! You've been Promoted for "${data.eventTitle}"`,
        html: wrapEmailHtml({
          title: "Waitlist Seat Open",
          bodyHtml: `<p>Dear ${data.recipientName || "Student"},</p>
          <p>A seat has opened up for <strong>"${data.eventTitle}"</strong> and your waitlist registration is now confirmed!</p>`,
          ctaText: "Claim Your Ticket Pass",
          ctaLink: `${portalBaseUrl}/tickets/${data.registrationId}`,
        }),
      };

    default:
      return {
        subject: `[Apollo Event Hub] Update on "${data.eventTitle || "Campus Event"}"`,
        html: wrapEmailHtml({
          title: data.eventTitle || "Campus Event Update",
          bodyHtml: `<p>${data.message || "You have a new update in the Apollo University Event Hub."}</p>`,
          ctaText: "Open Portal",
          ctaLink: portalBaseUrl,
        }),
      };
  }
}
