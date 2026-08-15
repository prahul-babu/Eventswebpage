import type { FirestoreTimestamp } from "./common";

// Report Types & Legacy Types for compatibility
export const REPORT_TYPES = [
  "EVENT_ATTENDANCE",
  "REVENUE_SUMMARY",
  "DEPARTMENT_METRICS",
  "STUDENT_PARTICIPATION",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface AttendanceMetric {
  totalRegistered: number;
  totalAttended: number;
  attendanceRatePercent: number;
  checkInByHour: Record<string, number>;
}

export interface RevenueMetric {
  totalRevenueINR: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  generatedBy: string;
  generatedByName: string;
  eventId?: string;
  department?: string;
  attendance?: AttendanceMetric;
  revenue?: RevenueMetric;
  exportUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreReportDocument {
  id?: string;
  type: ReportType;
  title: string;
  generatedBy: string;
  generatedByName: string;
  eventId?: string;
  department?: string;
  attendance?: AttendanceMetric;
  revenue?: RevenueMetric;
  exportUrl?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type EventReportStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED";

export const NAAC_CRITERIA = [
  { id: "1", code: "CRITERION_1", name: "Criterion 1: Curricular Aspects", description: "Curriculum design, academic flexibility, feedback systems" },
  { id: "2", code: "CRITERION_2", name: "Criterion 2: Teaching-Learning & Evaluation", description: "Student enrollment, teaching diversity, experiential learning" },
  { id: "3", code: "CRITERION_3", name: "Criterion 3: Research, Innovations & Extension", description: "Workshops, IPR, industry collaboration, community outreach" },
  { id: "4", code: "CRITERION_4", name: "Criterion 4: Infrastructure & Learning Resources", description: "Computing facilities, laboratories, digital knowledge access" },
  { id: "5", code: "CRITERION_5", name: "Criterion 5: Student Support & Progression", description: "Skill development, career counseling, sports, cultural activities" },
  { id: "6", code: "CRITERION_6", name: "Criterion 6: Governance, Leadership & Management", description: "Faculty empowerment, institutional development, quality audits" },
  { id: "7", code: "CRITERION_7", name: "Criterion 7: Institutional Values & Best Practices", description: "Environmental sustainability, gender equity, campus best practices" },
] as const;

export const NBA_OUTCOMES = [
  "PO1: Engineering Knowledge",
  "PO2: Problem Analysis",
  "PO3: Design / Development of Solutions",
  "PO4: Conduct Investigations of Complex Problems",
  "PO5: Modern Tool Usage",
  "PO6: The Engineer and Society",
  "PO7: Environment and Sustainability",
  "PO8: Ethics",
  "PO9: Individual and Team Work",
  "PO10: Communication",
  "PO11: Project Management and Finance",
  "PO12: Life-long Learning",
] as const;

export const SDG_GOALS = [
  { id: 1, name: "1. No Poverty" },
  { id: 2, name: "2. Zero Hunger" },
  { id: 3, name: "3. Good Health and Well-being" },
  { id: 4, name: "4. Quality Education" },
  { id: 5, name: "5. Gender Equality" },
  { id: 6, name: "6. Clean Water and Sanitation" },
  { id: 7, name: "7. Affordable and Clean Energy" },
  { id: 8, name: "8. Decent Work and Economic Growth" },
  { id: 9, name: "9. Industry, Innovation and Infrastructure" },
  { id: 10, name: "10. Reduced Inequalities" },
  { id: 11, name: "11. Sustainable Cities and Communities" },
  { id: 12, name: "12. Responsible Consumption and Production" },
  { id: 13, name: "13. Climate Action" },
  { id: 14, name: "14. Life Below Water" },
  { id: 15, name: "15. Life on Land" },
  { id: 16, name: "16. Peace, Justice and Strong Institutions" },
  { id: 17, name: "17. Partnerships for the Goals" },
] as const;

export const DOCUMENT_CATEGORIES = [
  "Schedule",
  "Attendance Sheet",
  "Feedback Form",
  "Certificate Sample",
  "Brochure",
  "Poster",
  "Press Clipping",
  "Permission Letter",
  "Other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface ResourcePerson {
  id: string;
  name: string;
  designation: string;
  organisation: string;
  sessionTopic: string;
  profile: string;
  photoUrl?: string;
  photoStoragePath?: string;
}

export interface ExpenseItem {
  id: string;
  head: string;
  description: string;
  amount: number;
  vendor: string;
  receiptUrl?: string;
  receiptStoragePath?: string;
}

export interface SponsorshipItem {
  id: string;
  sponsorName: string;
  amount: number;
  type: string;
}

export interface ReportPhoto {
  id: string;
  url: string;
  storagePath: string;
  caption?: string;
  isCover?: boolean;
  order: number;
}

export interface ReportVideo {
  id: string;
  url: string;
  storagePath?: string;
  title?: string;
  type: "UPLOAD" | "YOUTUBE" | "DRIVE";
}

export interface ReportDocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  url: string;
  storagePath: string;
  fileSize?: number;
}

export interface ParticipantQuote {
  id: string;
  quote: string;
  authorName: string;
  departmentOrRole: string;
}

// 7 Comprehensive Sections Data
export interface EventSummarySection {
  executiveSummary: string; // 100-500 words
  detailedProceedings: string;
  objectives: string[];
  outcomesAchieved: string[];
}

export interface ParticipationSection {
  registeredCount: number;
  actualAttendance: number;
  departmentWiseBreakdown: Record<string, number>;
  yearWiseBreakdown: Record<string, number>;
  externalParticipantsCount: number;
  externalInstitutions: string[];
  facultyCoordinators: string[];
  studentVolunteersCount: number;
  studentVolunteersNames: string[];
}

export interface BudgetFinanceSection {
  budgetAllocated: number;
  budgetSpent: number;
  balance: number;
  expenses: ExpenseItem[];
  sponsorships: SponsorshipItem[];
  revenueFromRegistrations: number;
}

export interface MediaSection {
  photos: ReportPhoto[];
  videos: ReportVideo[];
  documents: ReportDocumentItem[];
}

export interface FeedbackImpactSection {
  feedbackSummary: string;
  averageRating: number; // 1-5
  responseCount: number;
  participantQuotes: ParticipantQuote[];
  suggestionsForFuture: string;
}

export interface InstitutionalMappingSection {
  academicYear: string;
  naacCriterion: string;
  nbaProgrammeOutcomes: string[];
  sdgGoals: number[];
  activityType: "Curricular" | "Co-curricular" | "Extra-curricular" | "Outreach";
  collaboratingInstitutions: string[];
  certificatesIssuedCount: number;
  certificateTemplateUrl?: string;
}

/**
 * Master Post-Event Report Entity (reports/{eventId})
 */
export interface EventReport {
  id: string; // matches eventId
  eventId: string;
  eventTitle: string;
  category: string;
  eventDate: Date;
  venueLocation: string;
  department: string;
  organiserId: string;
  organiserName: string;
  organiserEmail: string;

  status: EventReportStatus;
  adminFeedback?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  submittedAt?: Date;

  // 7 Sections
  summary: EventSummarySection;
  participation: ParticipationSection;
  resourcePersons: ResourcePerson[];
  finance: BudgetFinanceSection;
  media: MediaSection;
  feedback: FeedbackImpactSection;
  institutionalMapping: InstitutionalMappingSection;

  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreEventReportDocument {
  id?: string;
  eventId: string;
  eventTitle: string;
  category: string;
  eventDate: FirestoreTimestamp;
  venueLocation: string;
  department: string;
  organiserId: string;
  organiserName: string;
  organiserEmail: string;

  status: EventReportStatus;
  adminFeedback?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: FirestoreTimestamp;
  submittedAt?: FirestoreTimestamp;

  summary: EventSummarySection;
  participation: ParticipationSection;
  resourcePersons: ResourcePerson[];
  finance: BudgetFinanceSection;
  media: MediaSection;
  feedback: FeedbackImpactSection;
  institutionalMapping: InstitutionalMappingSection;

  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
