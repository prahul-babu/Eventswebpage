import type { FirestoreTimestamp } from "./common";

// User Roles
export const USER_ROLES = ["student", "faculty", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// User Account Statuses
export const USER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// Notification Types
export type NotificationType =
  | "ACCESS_REQUESTED"
  | "ACCESS_APPROVED"
  | "ACCESS_REJECTED"
  | "ROLE_CHANGED"
  | "EVENT_SUBMITTED"
  | "EVENT_APPROVED"
  | "EVENT_REJECTED"
  | "EVENT_CHANGES_REQUESTED"
  | "EVENT_REGISTERED"
  | "REGISTRATION_CONFIRMED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_REFUNDED"
  | "EVENT_REMINDER_24H"
  | "EVENT_REMINDER_1H"
  | "EVENT_CANCELLED"
  | "WAITLIST_PROMOTED"
  | "REPORT_DUE"
  | "REPORT_APPROVED"
  | "REPORT_CHANGES_REQUESTED"
  | "EVENT_UPDATED"
  | "GENERAL_ANNOUNCEMENT";

export interface AdminNotification {
  id?: string;
  recipientUid: string;
  recipientEmail?: string;
  type: NotificationType | string;
  title: string;
  message?: string;
  body?: string;
  link?: string;
  data?: Record<string, any>;
  read: boolean;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  createdAt: any;
}

// Apollo University Academic Departments
export const DEPARTMENTS = [
  "School of Technology",
  "B.Tech. Computer Science and Engineering",
  "B.Tech. CSE - Artificial Intelligence and Data Science",
  "B.Tech. CSE - Artificial Intelligence and Machine Learning",
  "B.Tech. CSE - Cyber Security",
  "B.Tech. CSE - Cloud Computing",
  "B.Tech. CSE - AI & Health Care Technology",
  "School of Management",
  "School of Health Sciences",
  "General Administration",
] as const;

export const BTECH_SPECIALIZATIONS = [
  "B.Tech. Computer Science and Engineering",
  "B.Tech. CSE - Artificial Intelligence and Data Science",
  "B.Tech. CSE - Artificial Intelligence and Machine Learning",
  "B.Tech. CSE - Cyber Security",
  "B.Tech. CSE - Cloud Computing",
  "B.Tech. CSE - AI & Health Care Technology",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

// Academic Year Options for Students
export const ACADEMIC_YEARS = [
  "1st Year (B.Tech / UG)",
  "2nd Year (B.Tech / UG)",
  "3rd Year (B.Tech / UG)",
  "4th Year (B.Tech / UG)",
  "1st Year (PG / M.Tech / MBA / MHA)",
  "2nd Year (PG / M.Tech / MBA / MHA)",
  "PhD Research Scholar",
] as const;
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

// Academic Sections
export const ACADEMIC_SECTIONS = ["Section A", "Section B", "Section C", "Section D", "Not Applicable"] as const;
export type AcademicSection = (typeof ACADEMIC_SECTIONS)[number];

// Faculty Designations
export const FACULTY_DESIGNATIONS = [
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Dean / Director",
  "Head of Department (HoD)",
  "Adjunct Faculty",
  "Research Fellow",
] as const;
export type FacultyDesignation = (typeof FACULTY_DESIGNATIONS)[number];

export interface NotificationPreferences {
  eventUpdates: boolean;
  registrationAndPayments: boolean;
  approvalsAndAccess: boolean;
  reminders: boolean;
  announcements: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  eventUpdates: true,
  registrationAndPayments: true,
  approvalsAndAccess: true,
  reminders: true,
  announcements: true,
};

/**
 * Application-level User model (Dates mapped to JavaScript Date)
 */
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  department: Department | string;
  school?: string;
  
  // Student Specific Fields
  rollNumber?: string;
  studentId?: string;
  programme?: string;
  year?: AcademicYear | string;
  yearOfStudy?: string;
  semester?: string;
  section?: AcademicSection | string;
  batch?: string;
  personalEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  dietaryPreference?: string;
  skills?: string[];

  // Faculty / Staff Specific Fields
  employeeId?: string;
  facultyId?: string;
  designation?: FacultyDesignation | string;
  expertise?: string;
  officeLocation?: string;

  // Admin Specific Fields
  adminUnit?: string;
  adminId?: string;

  phoneNumber?: string;
  phone?: string;
  photoURL?: string;
  bio?: string;
  address?: string;
  ssoProvider?: string;
  onboardingCompleted: boolean;
  isProfileComplete?: boolean;

  // Notification Preferences & FCM Push
  notificationPrefs?: NotificationPreferences;
  fcmTokens?: string[];

  // Admin Approval Audit
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;

  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database-level Firestore Document structure for users/{uid}
 */
export interface FirestoreUserDocument {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  department: Department | string;
  school?: string;
  
  rollNumber?: string;
  studentId?: string;
  programme?: string;
  year?: AcademicYear | string;
  yearOfStudy?: string;
  semester?: string;
  section?: AcademicSection | string;
  batch?: string;
  personalEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  dietaryPreference?: string;
  skills?: string[];

  employeeId?: string;
  facultyId?: string;
  designation?: FacultyDesignation | string;
  expertise?: string;
  officeLocation?: string;

  adminUnit?: string;
  adminId?: string;

  phoneNumber?: string;
  phone?: string;
  photoURL?: string;
  bio?: string;
  address?: string;
  ssoProvider?: string;
  onboardingCompleted: boolean;
  isProfileComplete?: boolean;

  notificationPrefs?: NotificationPreferences;
  fcmTokens?: string[];

  approvedBy?: string;
  approvedAt?: FirestoreTimestamp;
  rejectionReason?: string;

  lastLoginAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * Institutional Allowlist / Roster Entry in allowlist/{emailKey}
 */
export interface AllowlistEntry {
  email: string;
  displayName: string;
  role: UserRole;
  department: Department | string;
  rollNumber?: string;
  employeeId?: string;
  designation?: string;
  active: boolean;
  createdAt?: FirestoreTimestamp;
}

/**
 * Response contract from resolveUser Cloud Function
 */
export interface ResolveUserResponse {
  state: "ready" | "onboarding_required";
  role?: UserRole;
  status?: UserStatus;
}

/**
 * Request Access Payload for requestAccess Cloud Function
 */
export interface RequestAccessPayload {
  requestedRole: "student" | "faculty";
  displayName?: string;
  department: Department | string;
  phone?: string;
  phoneNumber?: string;
  rollNumber?: string;
  year?: AcademicYear | string;
  section?: AcademicSection | string;
  employeeId?: string;
  designation?: FacultyDesignation | string;
}

/**
 * Set User Role Payload for setUserRole Cloud Function
 */
export interface SetUserRolePayload {
  targetUid: string;
  role: UserRole;
  status: UserStatus;
  rejectionReason?: string;
}
