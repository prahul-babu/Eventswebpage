export interface FacultyApplication {
  id: string;
  applicationId: string;
  uid?: string;
  fullName: string;
  officialEmail: string;
  mobileNumber: string;
  employeeId: string;
  department: string;
  school: string;
  designation: string;
  alternateEmail?: string;
  role: "faculty";
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected" | string;
  approvalStatus?: "pending" | "approved" | "rejected" | string;
  isApproved?: boolean;
  approvalEmailSent?: boolean;
  approvalEmailSentAt?: Date | null;
  submittedAt: Date;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
}
