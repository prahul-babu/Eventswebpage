export const USER_ROLES = ["student", "faculty", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// Apollo University B.Tech Academic Programmes (Strict Single Source of Truth)
export const BTECH_PROGRAMMES = [
  "B.Tech. Computer Science and Engineering",
  "B.Tech. CSE - Artificial Intelligence and Data Science",
  "B.Tech. CSE - Artificial Intelligence and Machine Learning",
  "B.Tech. CSE - Cyber Security",
  "B.Tech. CSE - Cloud Computing",
  "B.Tech. CSE - AI & Health Care Technology",
] as const;

export type BTechProgramme = (typeof BTECH_PROGRAMMES)[number];

export const BTECH_FACULTY_DEPARTMENTS = BTECH_PROGRAMMES;
export const BTECH_SPECIALIZATIONS = BTECH_PROGRAMMES;
export const DEPARTMENTS = BTECH_PROGRAMMES;

export type Department = (typeof DEPARTMENTS)[number];

export const ACADEMIC_YEARS = [
  "1st Year (B.Tech / UG)",
  "2nd Year (B.Tech / UG)",
  "3rd Year (B.Tech / UG)",
  "4th Year (B.Tech / UG)",
] as const;
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

export const ACADEMIC_SECTIONS = ["Section A", "Section B", "Section C", "Section D", "Not Applicable"] as const;
export type AcademicSection = (typeof ACADEMIC_SECTIONS)[number];

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

export const DEFAULT_NOTIFICATION_PREFS = {
  eventUpdates: true,
  registrationAndPayments: true,
  approvalsAndAccess: true,
  reminders: true,
  announcements: true,
};
