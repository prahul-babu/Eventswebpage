import { jsPDF } from "jspdf";
import { format } from "date-fns";
import type { Registration, Event, Payment } from "@/types";

export interface ReceiptData {
  registration: Registration;
  event: Event;
  payment?: Payment | null;
}

export function generateEventReceiptPDF(data: ReceiptData) {
  const { registration, event, payment } = data;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // 1. Header & Institutional Banner (Indigo theme)
  doc.setFillColor(49, 46, 129); // Indigo 900
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("THE APOLLO UNIVERSITY", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11); // Amber 400
  doc.text("OFFICIAL EVENT REGISTRATION & PAYMENT RECEIPT", margin, 26);

  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  doc.text("Campus Portal: eventhub.apollouniversity.edu.in", margin, 33);

  // 2. Receipt Meta Box
  const startY = 52;
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TRANSACTION SUMMARY", margin, startY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate 600

  const receiptNo = `REC-${registration.ticketCode || "APL-0000"}`;
  const issueDate = format(new Date(), "dd MMMM yyyy, h:mm a");

  doc.text(`Receipt Number: ${receiptNo}`, margin, startY + 8);
  doc.text(`Date of Issue: ${issueDate}`, margin, startY + 14);
  doc.text(`Payment Gateway: Razorpay Institutional`, margin, startY + 20);

  // 3. Student Credentials Table
  const studentY = startY + 30;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, studentY, pageWidth - margin * 2, 28, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, studentY, pageWidth - margin * 2, 28, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Student / Attendee Details", margin + 5, studentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  doc.text(`Name: ${registration.userDisplayName}`, margin + 5, studentY + 14);
  doc.text(`Email: ${registration.userEmail}`, margin + 5, studentY + 20);

  const rightColX = pageWidth / 2 + 5;
  doc.text(`Roll / ID: ${registration.userRollNumber || "N/A"}`, rightColX, studentY + 14);
  doc.text(`Department: ${registration.userDepartment || "Apollo University"}`, rightColX, studentY + 20);

  // 4. Event Information Box
  const eventY = studentY + 36;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, eventY, pageWidth - margin * 2, 34, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, eventY, pageWidth - margin * 2, 34, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Registered Event Information", margin + 5, eventY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  doc.text(`Event Title: ${event.title}`, margin + 5, eventY + 14);
  doc.text(
    `Date & Time: ${format(event.startAt, "EEE, MMM d, yyyy &bull; h:mm a")}`,
    margin + 5,
    eventY + 20
  );
  doc.text(`Venue / Mode: ${event.venueLocation} (${event.venueType})`, margin + 5, eventY + 26);

  // 5. Line Item & Total Table
  const tableY = eventY + 44;
  doc.setFillColor(49, 46, 129);
  doc.rect(margin, tableY, pageWidth - margin * 2, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Item Description", margin + 5, tableY + 5.5);
  doc.text("Qty", pageWidth - margin - 50, tableY + 5.5);
  doc.text("Amount (INR)", pageWidth - margin - 25, tableY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const rowY = tableY + 14;
  doc.text(`Official Pass: ${event.title}`, margin + 5, rowY);
  doc.text("1", pageWidth - margin - 47, rowY);
  doc.text(
    event.isPaid ? `Rs. ${event.price.toFixed(2)}` : "Free Entry (Rs. 0.00)",
    pageWidth - margin - 25,
    rowY
  );

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, rowY + 5, pageWidth - margin, rowY + 5);

  // Total Row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Total Paid:", pageWidth - margin - 55, rowY + 13);
  doc.text(
    event.isPaid ? `Rs. ${event.price.toFixed(2)}` : "Rs. 0.00",
    pageWidth - margin - 25,
    rowY + 13
  );

  // Payment IDs & Transaction Reference
  const transY = rowY + 25;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ticket Pass Code: ${registration.ticketCode}`, margin, transY);
  if (payment?.razorpayPaymentId) {
    doc.text(`Razorpay Payment ID: ${payment.razorpayPaymentId}`, margin, transY + 5);
  }
  if (payment?.razorpayOrderId) {
    doc.text(`Razorpay Order ID: ${payment.razorpayOrderId}`, margin, transY + 10);
  }

  // 6. Institutional Stamp & Verification Footnote
  const footerY = 265;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "This is a computer-generated institutional receipt issued by The Apollo University Event Hub. No physical signature is required.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text(
    "For inquiries, contact the organizing department or email events@apollouniversity.edu.in",
    pageWidth / 2,
    footerY + 4,
    { align: "center" }
  );

  // Save the PDF
  doc.save(`Apollo_Event_Receipt_${registration.ticketCode || "Pass"}.pdf`);
}
