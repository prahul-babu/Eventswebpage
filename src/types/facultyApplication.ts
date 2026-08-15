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
  status: "pending" | "approved" | "rejected";
  submittedAt: Date;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
}
