import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { EventReport } from "@/types";

export function generateEventReportPdf(report: EventReport): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // =========================================================================
  // 1. Institutional Header & Letterhead
  // =========================================================================
  doc.setFillColor(49, 46, 129); // #312E81 Indigo 950
  doc.rect(0, 0, pageWidth, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("THE APOLLO UNIVERSITY", pageWidth / 2, 10, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255); // Indigo 100
  doc.text(
    `DIRECTORATE OF ACADEMIC QUALITY & EVENT GOVERNANCE • ${report.department.toUpperCase()}`,
    pageWidth / 2,
    16,
    { align: "center" }
  );
  doc.text(
    "OFFICIAL POST-EVENT COMPREHENSIVE OUTCOME REPORT",
    pageWidth / 2,
    21,
    { align: "center" }
  );

  currentY = 32;

  // Metadata Strip
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(report.eventTitle, 14, currentY);

  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  const eventDateStr = report.eventDate ? format(new Date(report.eventDate), "MMMM dd, yyyy") : "N/A";
  doc.text(
    `Category: ${report.category}  |  Date: ${eventDateStr}  |  Venue: ${report.venueLocation}`,
    14,
    currentY
  );

  currentY += 5;
  doc.text(
    `Organiser: ${report.organiserName} (${report.organiserEmail})  |  Status: ${report.status}`,
    14,
    currentY
  );

  currentY += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 8;

  // Helper for Section Headers
  const renderSectionHeader = (title: string, sectionNumber: number) => {
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY - 4, pageWidth - 28, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(49, 46, 129);
    doc.text(`SECTION ${sectionNumber}: ${title.toUpperCase()}`, 16, currentY + 1);
    currentY += 9;
  };

  // =========================================================================
  // Section 1: Event Summary
  // =========================================================================
  renderSectionHeader("Executive Summary & Objectives", 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Executive Summary:", 14, currentY);
  currentY += 4;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const execSummaryLines = doc.splitTextToSize(
    report.summary.executiveSummary.replace(/<[^>]*>/g, "") || "No executive summary provided.",
    pageWidth - 28
  );
  doc.text(execSummaryLines, 14, currentY);
  currentY += execSummaryLines.length * 4.2 + 4;

  if (report.summary.objectives && report.summary.objectives.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Core Objectives & Outcomes Achieved:", 14, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    report.summary.objectives.forEach((obj, idx) => {
      const outcome = report.summary.outcomesAchieved[idx] || "Achieved according to plan";
      const objText = doc.splitTextToSize(`• Obj ${idx + 1}: ${obj} -> Outcome: ${outcome}`, pageWidth - 32);
      doc.text(objText, 18, currentY);
      currentY += objText.length * 4;
    });
    currentY += 4;
  }

  // =========================================================================
  // Section 2: Participation Metrics
  // =========================================================================
  renderSectionHeader("Participation & Attendance Metrics", 2);

  const deptEntries = Object.entries(report.participation.departmentWiseBreakdown || {});
  autoTable(doc, {
    startY: currentY,
    head: [["Metric Category", "Institutional Count", "Notes / Breakdown"]],
    body: [
      ["Total Registrations", String(report.participation.registeredCount), "Confirmed student registrations"],
      ["Actual Verified Attendance", String(report.participation.actualAttendance), `${report.participation.registeredCount ? Math.round((report.participation.actualAttendance / report.participation.registeredCount) * 100) : 100}% turnout rate`],
      ["Department Representation", String(deptEntries.length), deptEntries.map(([d, c]) => `${d}: ${c}`).join(", ") || "General Campus"],
      ["External Participants", String(report.participation.externalParticipantsCount), (report.participation.externalInstitutions || []).join(", ") || "None"],
      ["Student Volunteers", String(report.participation.studentVolunteersCount), (report.participation.studentVolunteersNames || []).join(", ") || "N/A"],
    ],
    theme: "grid",
    headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // =========================================================================
  // Section 3: Keynote Speakers & Resource Persons
  // =========================================================================
  if (report.resourcePersons && report.resourcePersons.length > 0) {
    renderSectionHeader("Resource Persons & Keynote Speakers", 3);

    autoTable(doc, {
      startY: currentY,
      head: [["Name & Designation", "Organisation", "Session Topic"]],
      body: report.resourcePersons.map((p) => [
        `${p.name}\n${p.designation}`,
        p.organisation,
        p.sessionTopic,
      ]),
      theme: "grid",
      headStyles: { fillColor: [49, 46, 129], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // =========================================================================
  // Section 4: Budget & Financial Statement
  // =========================================================================
  renderSectionHeader("Financial Statement & Expenditure Statement", 4);

  const expenseRows = (report.finance.expenses || []).map((e) => [
    e.head,
    e.description,
    e.vendor,
    `INR ${e.amount.toLocaleString()}`,
  ]);

  expenseRows.push([
    "TOTAL SPENT",
    "-",
    "-",
    `INR ${report.finance.budgetSpent.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Budget Head", "Description", "Vendor / Source", "Amount (INR)"]],
    body: expenseRows,
    theme: "striped",
    headStyles: { fillColor: [49, 46, 129], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Allocated: INR ${report.finance.budgetAllocated.toLocaleString()}  |  Registrations Revenue: INR ${report.finance.revenueFromRegistrations.toLocaleString()}  |  Balance: INR ${report.finance.balance.toLocaleString()}`,
    14,
    currentY
  );
  currentY += 8;

  // =========================================================================
  // Section 5: Institutional Accreditation Mapping (NAAC / NBA / SDG)
  // =========================================================================
  renderSectionHeader("Accreditation & Institutional Mapping", 5);

  autoTable(doc, {
    startY: currentY,
    head: [["Accreditation Benchmark", "Classifications & Mapped Programme Outcomes"]],
    body: [
      ["Academic Year", report.institutionalMapping?.academicYear || "2025-26"],
      ["NAAC Criterion", report.institutionalMapping?.naacCriterion || "Academic & Co-curricular"],
      ["NBA Programme Outcomes", (report.institutionalMapping?.nbaProgrammeOutcomes || []).join(", ") || "PO1, PO2"],
      ["UN Sustainable Development Goals", (report.institutionalMapping?.sdgGoals || []).map((g) => `Goal ${g}`).join(", ") || "Goal 4 (Quality Education)"],
      ["Activity Classification", report.institutionalMapping?.activityType || "Co-curricular"],
      ["Certificates Issued", `${report.institutionalMapping?.certificatesIssuedCount || report.participation?.registeredCount || 0} E-Certificates verified`],
    ],
    theme: "grid",
    headStyles: { fillColor: [49, 46, 129], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // =========================================================================
  // Section 6: Official Signatures Block
  // =========================================================================
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  }

  currentY += 10;
  doc.setDrawColor(148, 163, 184);

  const col1X = 20;
  const col2X = pageWidth / 2 - 25;
  const col3X = pageWidth - 65;

  doc.line(col1X, currentY + 12, col1X + 45, currentY + 12);
  doc.line(col2X, currentY + 12, col2X + 45, currentY + 12);
  doc.line(col3X, currentY + 12, col3X + 45, currentY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  doc.text("Organising Faculty", col1X, currentY + 16);
  doc.text("Head of Department (HoD)", col2X, currentY + 16);
  doc.text("Dean / Registrar", col3X, currentY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(report.organiserName, col1X, currentY + 20);
  doc.text(report.department, col2X, currentY + 20);
  doc.text("The Apollo University", col3X, currentY + 20);

  return doc;
}
