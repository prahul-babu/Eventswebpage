import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
} from "docx";
import fileSaver from "file-saver";
const saveAs = (fileSaver as any).saveAs || fileSaver;
import { format } from "date-fns";
import type { EventReport } from "@/types";
import { sanitizeDownloadFileName } from "../../config/file-types";

/**
 * Generate a complete, professionally formatted Microsoft Word (.docx) Document
 * for an Apollo University Event Report.
 */
export async function generateEventReportDocxBlob(report: EventReport): Promise<Blob> {
  const eventDateStr = report.eventDate
    ? format(new Date(report.eventDate), "MMMM dd, yyyy")
    : "N/A";

  const borderColor = "D1D5DB"; // Gray 300
  const tableCellBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
  };

  const createSectionHeader = (title: string, sectionNumber: number) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: `SECTION ${sectionNumber}: ${title.toUpperCase()}`,
          bold: true,
          color: "004D61", // Apollo University Teal / Blue
          size: 24, // 12pt
        }),
      ],
    });
  };

  // Helper for 2-column key-value rows in tables
  const createMetaRow = (key1: string, val1: string, key2: string, val2: string) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: "F8FAFC", type: ShadingType.CLEAR },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: key1, bold: true, size: 18, color: "334155" })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: val1 || "—", size: 18, color: "0F172A" })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: "F8FAFC", type: ShadingType.CLEAR },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: key2, bold: true, size: 18, color: "334155" })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: val2 || "—", size: 18, color: "0F172A" })] })],
        }),
      ],
    });
  };

  // Resource Persons Rows
  const resourcePersonRows: TableRow[] = (report.resourcePersons || []).map((rp, idx) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: rp.name, bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: `${rp.designation || ""} - ${rp.organisation || ""}`, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: rp.sessionTopic || "Keynote Session", size: 18 })] })],
        }),
      ],
    });
  });

  // Expense items rows
  const expenseRows: TableRow[] = (report.finance?.expenses || []).map((exp, idx) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: exp.head || "General", bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: exp.description || "—", size: 18 })] })],
        }),
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: exp.vendor || "—", size: 18 })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: tableCellBorders,
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₹${(exp.amount || 0).toLocaleString()}`, bold: true, size: 18 })] })],
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "The Apollo University • School of Technology • B.Tech Event Hub",
                    size: 16,
                    color: "64748B",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Official Event Outcome Report — ${report.eventTitle}   |   Page `,
                    size: 16,
                    color: "64748B",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: "64748B",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Institutional Header Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "THE APOLLO UNIVERSITY",
                bold: true,
                size: 32, // 16pt
                color: "004D61",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `School of Technology • Department of ${report.department || "Technology"}`,
                bold: true,
                size: 20,
                color: "007A99",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "OFFICIAL POST-EVENT OUTCOME & ACCREDITATION REPORT",
                bold: true,
                size: 20,
                color: "334155",
              }),
            ],
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createMetaRow("Event Title:", report.eventTitle, "Category:", report.category),
              createMetaRow("Event Date:", eventDateStr, "Venue Location:", report.venueLocation),
              createMetaRow(
                "Organiser Name:",
                report.organiserName,
                "Organiser Email:",
                report.organiserEmail
              ),
              createMetaRow(
                "Department:",
                report.department,
                "Report Status:",
                report.status
              ),
            ],
          }),

          // Section 1: Executive Summary & Objectives
          createSectionHeader("Executive Summary & Objectives", 1),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: report.summary?.executiveSummary
                  ? report.summary.executiveSummary.replace(/<[^>]+>/g, " ").trim()
                  : "No executive summary provided.",
                size: 20,
                color: "1E293B",
              }),
            ],
          }),

          ...(report.summary?.objectives && report.summary.objectives.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 100, after: 60 },
                  children: [new TextRun({ text: "Key Objectives:", bold: true, size: 20, color: "004D61" })],
                }),
                ...report.summary.objectives.map(
                  (obj) =>
                    new Paragraph({
                      bullet: { level: 0 },
                      spacing: { after: 40 },
                      children: [new TextRun({ text: obj, size: 20 })],
                    })
                ),
              ]
            : []),

          ...(report.summary?.outcomesAchieved && report.summary.outcomesAchieved.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 100, after: 60 },
                  children: [new TextRun({ text: "Outcomes Achieved:", bold: true, size: 20, color: "004D61" })],
                }),
                ...report.summary.outcomesAchieved.map(
                  (outcome) =>
                    new Paragraph({
                      bullet: { level: 0 },
                      spacing: { after: 40 },
                      children: [new TextRun({ text: outcome, size: 20 })],
                    })
                ),
              ]
            : []),

          // Section 2: Participation & Demographics
          createSectionHeader("Verified Attendance & Participation", 2),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createMetaRow(
                "Registered Count:",
                String(report.participation?.registeredCount ?? 0),
                "Verified Attendance:",
                String(report.participation?.actualAttendance ?? 0)
              ),
              createMetaRow(
                "Attendance Turnout:",
                report.participation?.registeredCount
                  ? `${Math.round(
                      ((report.participation?.actualAttendance || 0) /
                        report.participation.registeredCount) *
                        100
                    )}%`
                  : "100%",
                "Student Volunteers:",
                String(report.participation?.studentVolunteersCount ?? 0)
              ),
              createMetaRow(
                "External Participants:",
                String(report.participation?.externalParticipantsCount ?? 0),
                "Student Coordinators:",
                report.participation?.studentVolunteersNames?.join(", ") || "—"
              ),
            ],
          }),

          // Section 3: Resource Persons
          createSectionHeader("Resource Persons & Keynote Speakers", 3),
          ...(resourcePersonRows.length > 0
            ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 10, type: WidthType.PERCENTAGE },
                          shading: { fill: "004D61", type: ShadingType.CLEAR },
                          borders: tableCellBorders,
                          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "#", bold: true, color: "FFFFFF", size: 18 })] })],
                        }),
                        new TableCell({
                          width: { size: 25, type: WidthType.PERCENTAGE },
                          shading: { fill: "004D61", type: ShadingType.CLEAR },
                          borders: tableCellBorders,
                          children: [new Paragraph({ children: [new TextRun({ text: "Speaker / Expert", bold: true, color: "FFFFFF", size: 18 })] })],
                        }),
                        new TableCell({
                          width: { size: 30, type: WidthType.PERCENTAGE },
                          shading: { fill: "004D61", type: ShadingType.CLEAR },
                          borders: tableCellBorders,
                          children: [new Paragraph({ children: [new TextRun({ text: "Designation & Org", bold: true, color: "FFFFFF", size: 18 })] })],
                        }),
                        new TableCell({
                          width: { size: 35, type: WidthType.PERCENTAGE },
                          shading: { fill: "004D61", type: ShadingType.CLEAR },
                          borders: tableCellBorders,
                          children: [new Paragraph({ children: [new TextRun({ text: "Topic / Session", bold: true, color: "FFFFFF", size: 18 })] })],
                        }),
                      ],
                    }),
                    ...resourcePersonRows,
                  ],
                }),
              ]
            : [
                new Paragraph({
                  children: [new TextRun({ text: "No external resource persons recorded for this event.", italics: true, size: 20 })],
                }),
              ]),

          // Section 4: Budget & Finance
          createSectionHeader("Budget Statement & Expenditure", 4),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createMetaRow(
                "Budget Allocated:",
                `₹${(report.finance?.budgetAllocated ?? 0).toLocaleString()}`,
                "Total Spent:",
                `₹${(report.finance?.budgetSpent ?? 0).toLocaleString()}`
              ),
              createMetaRow(
                "Remaining Balance:",
                `₹${(report.finance?.balance ?? 0).toLocaleString()}`,
                "Registrations Revenue:",
                `₹${(report.finance?.revenueFromRegistrations ?? 0).toLocaleString()}`
              ),
            ],
          }),

          ...(expenseRows.length > 0
            ? [
                new Paragraph({
                  spacing: { before: 120, after: 60 },
                  children: [new TextRun({ text: "Itemized Expense Records:", bold: true, size: 20, color: "004D61" })],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 8, type: WidthType.PERCENTAGE },
                          shading: { fill: "004D61", type: ShadingType.CLEAR },
                          borders: tableCellBorders,
                          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "#", bold: true, color: "FFFFFF", size: 18 })] })],
                        }),
                        new TableCell({
                          width: { size: 25, type: WidthType.PERCENTAGE },
                          shading: { fill: "004D61", type: ShadingType.CLEAR },
                          borders: tableCellBorders,
                          children: [new Paragraph({ children: [new TextRun({ text: "Budget Head", bold: true, color: "FFFFFF", size: 18 })] })],
                        }),
                        new TableCell({
                          width: { size: 35, type: WidthType.PERCENTAGE },
                          shading: { fill: "004D61", type: ShadingType.CLEAR },
                          borders: tableCellBorders,
                          children: [new Paragraph({ children: [new TextRun({ text: "Item Description", bold: true, color: "FFFFFF", size: 18 })] })],
                        }),
                        new TableCell({
                          width: { size: 17, type: WidthType.PERCENTAGE },
                          shading: { fill: "004D61", type: ShadingType.CLEAR },
                          borders: tableCellBorders,
                          children: [new Paragraph({ children: [new TextRun({ text: "Vendor", bold: true, color: "FFFFFF", size: 18 })] })],
                        }),
                        new TableCell({
                          width: { size: 15, type: WidthType.PERCENTAGE },
                          shading: { fill: "004D61", type: ShadingType.CLEAR },
                          borders: tableCellBorders,
                          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Amount (₹)", bold: true, color: "FFFFFF", size: 18 })] })],
                        }),
                      ],
                    }),
                    ...expenseRows,
                  ],
                }),
              ]
            : []),

          // Section 5: Attendee Feedback & Impact
          createSectionHeader("Participant Feedback & Outcomes", 5),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createMetaRow(
                "Average Rating:",
                `${report.feedback?.averageRating ?? 5.0} / 5.0 ★`,
                "Survey Responses:",
                String(report.feedback?.responseCount ?? 0)
              ),
            ],
          }),
          ...(report.feedback?.feedbackSummary
            ? [
                new Paragraph({
                  spacing: { before: 80, after: 60 },
                  children: [new TextRun({ text: "Feedback Summary:", bold: true, size: 20 })],
                }),
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: report.feedback.feedbackSummary, size: 20 })],
                }),
              ]
            : []),

          // Section 6: Institutional & Accreditation Mapping
          createSectionHeader("Accreditation & Institutional Mapping", 6),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createMetaRow(
                "Academic Year:",
                report.institutionalMapping?.academicYear || "2025-26",
                "NAAC Criterion:",
                report.institutionalMapping?.naacCriterion || "Curricular Aspects"
              ),
              createMetaRow(
                "Activity Type:",
                report.institutionalMapping?.activityType || "Co-curricular",
                "Certificates Issued:",
                String(report.institutionalMapping?.certificatesIssuedCount ?? 0)
              ),
            ],
          }),

          // Institutional Verification Footer Notice
          new Paragraph({
            spacing: { before: 240, after: 60 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "— End of Official Institutional Report —",
                italics: true,
                size: 18,
                color: "64748B",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "The Apollo University • Directorate of Academic Quality & Event Governance",
                bold: true,
                size: 16,
                color: "004D61",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Trigger browser download for a generated Word .docx report
 */
export async function downloadEventReportDocx(report: EventReport): Promise<void> {
  const blob = await generateEventReportDocxBlob(report);
  const baseName = sanitizeDownloadFileName(report.eventTitle || "Event");
  const fileName = `${baseName}-Event-Report.docx`;
  saveAs(blob, fileName);
}
