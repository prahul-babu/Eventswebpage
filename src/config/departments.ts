/**
 * Centralized Single Source of Truth for B.Tech Departments & Programmes
 * The Apollo University — School of Technology — B.Tech Event Hub
 */

export const PARENT_SCHOOL = "School of Technology";
export const INSTITUTIONAL_PROGRAMME = "B.Tech";

/**
 * Valid B.Tech Academic Programmes / Streams (Strict Single Source of Truth for Students & Faculty)
 */
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
export const BTECH_STUDENT_SPECIALIZATIONS = BTECH_PROGRAMMES;
export const ALL_BTECH_DEPARTMENTS = BTECH_PROGRAMMES;
export const DEPARTMENTS = BTECH_PROGRAMMES;

/**
 * Forbidden Non-B.Tech Organizations & Generic School Terms (strictly excluded and rejected)
 */
export const FORBIDDEN_NON_BTECH_KEYWORDS = [
  "school of management",
  "school of health sciences",
  "general administration",
  "school of technology",
  "management",
  "health sciences",
  "business administration",
  "mba",
  "mha",
] as const;

/**
 * Academic Year Progression for B.Tech Undergraduate Students
 */
export const BTECH_ACADEMIC_YEARS = [
  "1st Year (B.Tech / UG)",
  "2nd Year (B.Tech / UG)",
  "3rd Year (B.Tech / UG)",
  "4th Year (B.Tech / UG)",
] as const;

/**
 * Check if a department string contains forbidden non-B.Tech terminology
 */
export function isForbiddenNonBTechDepartment(dept?: string | null): boolean {
  if (!dept) return false;
  const normalized = dept.trim().toLowerCase();
  if (
    normalized === "school of technology" ||
    normalized === "general administration" ||
    normalized === "school of management" ||
    normalized === "school of health sciences"
  ) {
    return true;
  }
  return FORBIDDEN_NON_BTECH_KEYWORDS.some((kw) => normalized.includes(kw));
}

/**
 * Verify if a department belongs to the allowed B.Tech ecosystem
 */
export function isAllowedBTechDepartment(dept?: string | null): boolean {
  if (!dept) return false;
  if (isForbiddenNonBTechDepartment(dept)) return false;
  const normalized = dept.trim().toLowerCase();
  return BTECH_PROGRAMMES.some((allowed) => allowed.toLowerCase() === normalized);
}

/**
 * Normalize department / programme to safe B.Tech default if empty or non-B.Tech
 */
export function normalizeBTechDepartment(
  dept?: string | null,
  fallback = "B.Tech. Computer Science and Engineering"
): string {
  if (!dept || isForbiddenNonBTechDepartment(dept)) {
    return fallback;
  }
  const matched = BTECH_PROGRAMMES.find((p) => p.toLowerCase() === dept.trim().toLowerCase());
  return matched || fallback;
}
