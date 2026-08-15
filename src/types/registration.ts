import type { FirestoreTimestamp } from "./common";

// Registration Statuses
export const REGISTRATION_STATUSES = [
  "CONFIRMED",
  "PENDING_PAYMENT",
  "WAITLISTED",
  "CANCELLED",
  "ATTENDED",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

// Check-in verification methods
export const CHECK_IN_METHODS = ["QR_SCAN", "MANUAL", "SELF"] as const;
export type CheckInMethod = (typeof CHECK_IN_METHODS)[number];

export interface TeamMember {
  name: string;
  email: string;
  rollNumber?: string;
}

/**
 * Application-level Registration model (Dates mapped to JavaScript Date)
 */
export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  
  // Student Profile Snapshot at booking time
  userDisplayName: string;
  userEmail: string;
  userRollNumber?: string;
  userDepartment?: string;
  userPhone?: string;

  // Status & Verification
  status: RegistrationStatus;
  ticketCode: string; // e.g. "APL-8K29M7PQ"
  qrCodePayload: string; // Encrypted / signed ticket token

  // Team Registration Details
  teamName?: string;
  teamMembers?: TeamMember[];

  // Custom Organizer Question Answers
  answers?: Record<string, string | string[]>;

  // Payment Tracking (For Paid Events)
  isPaid: boolean;
  paymentId?: string;
  amountPaid: number;
  refundFlagged?: boolean;

  // On-Site Attendance Check-in
  checkedIn: boolean;
  checkedInAt?: Date;
  checkedInBy?: string;
  checkInMethod?: CheckInMethod;

  registeredAt: Date;
  updatedAt: Date;
}

/**
 * Database-level Firestore Document structure for registrations/{registrationId}
 */
export interface FirestoreRegistrationDocument {
  eventId: string;
  userId: string;
  
  userDisplayName: string;
  userEmail: string;
  userRollNumber?: string;
  userDepartment?: string;
  userPhone?: string;

  status: RegistrationStatus;
  ticketCode: string;
  qrCodePayload: string;

  teamName?: string;
  teamMembers?: TeamMember[];
  answers?: Record<string, string | string[]>;

  isPaid: boolean;
  paymentId?: string;
  amountPaid: number;
  refundFlagged?: boolean;

  checkedIn: boolean;
  checkedInAt?: FirestoreTimestamp;
  checkedInBy?: string;
  checkInMethod?: CheckInMethod;

  registeredAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * Create Registration Payload sent to Cloud Function
 */
export interface CreateRegistrationPayload {
  eventId: string;
  contactPhone?: string;
  teamName?: string;
  teamMembers?: TeamMember[];
  answers?: Record<string, string | string[]>;
}

/**
 * Response from createRegistration Cloud Function
 */
export interface CreateRegistrationResponse {
  success: boolean;
  registrationId: string;
  ticketCode: string;
  status: RegistrationStatus;
  requiresPayment: boolean;
  amount: number;
  message?: string;
}

/**
 * Cancel Registration Payload
 */
export interface CancelRegistrationPayload {
  registrationId: string;
  reason?: string;
}

/**
 * Cancel Registration Response
 */
export interface CancelRegistrationResponse {
  success: boolean;
  promotedWaitlistId?: string;
  refundFlagged?: boolean;
}
