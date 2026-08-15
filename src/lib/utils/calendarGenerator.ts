import type { Event, Registration } from "@/types";

/**
 * Formats a JavaScript Date into iCalendar UTC datetime format (YYYYMMDDTHHmmssZ)
 */
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generates and downloads an RFC 5545 compliant .ics calendar file
 */
export function downloadEventICalFile(event: Event, registration?: Registration) {
  const startStr = formatICalDate(event.startAt);
  const endStr = formatICalDate(event.endAt);
  const nowStr = formatICalDate(new Date());

  const cleanDescription = (event.description || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/\n/g, "\\n")
    .substring(0, 500);

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Apollo University//Event Hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:APL-EVT-${event.id}-${registration?.ticketCode || "PASS"}@apollouniversity.edu.in`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${event.title.replace(/[,;]/g, " ")}`,
    `DESCRIPTION:${cleanDescription}\\n\\nTicket Code: ${registration?.ticketCode || "General"}`,
    `LOCATION:${(event.venueLocation || "The Apollo University Campus").replace(/[,;]/g, " ")}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${event.title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", `Apollo_Event_${event.title.replace(/\s+/g, "_")}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
