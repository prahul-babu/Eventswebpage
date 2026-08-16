/**
 * Centralized Single Source of Truth for B.Tech Departments & Specializations
 * The Apollo University — School of Technology — B.Tech Event Hub
 */

export const PARENT_SCHOOL = "School of Technology";
export const INSTITUTIONAL_PROGRAMME = "B.Tech";

/**
 * Valid B.Tech Academic Departments (for Faculty, Events, Reports, Admin)
 */
export const BTECH_FACULTY_DEPARTMENTS = [
  "Department of Computer Science & Engineering",
  "Department of AI & Data Science",
  "Department of Cyber Security",
  "Department of Information Technology",
  "Department of Electronics & Communication Engineering",
  "Department of Electrical & Electronics Engineering",
  "Department of Mechanical Engineering",
  "Department of Civil Engineering",
] as const;

/**
 * Valid B.Tech Student Degree Streams / Specializations
 */
export const BTECH_STUDENT_SPECIALIZATIONS = [
  "B.Tech. Computer Science and Engineering",
  "B.Tech. CSE - Artificial Intelligence and Data Science",
  "B.Tech. CSE - Artificial Intelligence and Machine Learning",
  "B.Tech. CSE - Cyber Security",
  "B.Tech. CSE - Cloud Computing",
  "B.Tech. CSE - AI & Health Care Technology",
  "B.Tech. Information Technology",
  "B.Tech. Electronics & Communication Engineering",
  "B.Tech. Electrical & Electronics Engineering",
  "B.Tech. Mechanical Engineering",
  "B.Tech. Civil Engineering",
] as const;

/**
 * Master List of Allowed B.Tech Academic Units
 */
export const ALL_BTECH_DEPARTMENTS = [
  ...BTECH_STUDENT_SPECIALIZATIONS,
  ...BTECH_FACULTY_DEPARTMENTS,
] as const;

/**
 * Forbidden Non-B.Tech Organizations (strictly excluded and rejected)
 */
export const FORBIDDEN_NON_BTECH_KEYWORDS = [
  "school of management",
  "school of health sciences",
  "general administration",
  "management",
  "health sciences",
  "business administration",
  "mba",
  "mha",
] as const;

/**
 * Academic Year Progression for B.Tech & Engineering Scholars
 */
export const BTECH_ACADEMIC_YEARS = [
  "1st Year (B.Tech / UG)",
  "2nd Year (B.Tech / UG)",
  "3rd Year (B.Tech / UG)",
  "4th Year (B.Tech / UG)",
  "1st Year (M.Tech / PG)",
  "2nd Year (M.Tech / PG)",
  "PhD Research Scholar",
] as const;

/**
 * Check if a department string contains forbidden non-B.Tech terminology
 */
export function isForbiddenNonBTechDepartment(dept?: string | null): boolean {
  if (!dept) return false;
  const normalized = dept.trim().toLowerCase();
  return FORBIDDEN_NON_BTECH_KEYWORDS.some((kw) => normalized.includes(kw));
}

/**
 * Verify if a department belongs to the allowed B.Tech ecosystem
 */
export function isAllowedBTechDepartment(dept?: string | null): boolean {
  if (!dept) return false;
  if (isForbiddenNonBTechDepartment(dept)) return false;
  const normalized = dept.trim().toLowerCase();
  return ALL_BTECH_DEPARTMENTS.some((allowed) => allowed.toLowerCase() === normalized);
}

/**
 * Normalize department to safe B.Tech default if empty or non-B.Tech
 */
export function normalizeBTechDepartment(dept?: string | null, fallback = "Department of Computer Science & Engineering"): string {
  if (!dept || isForbiddenNonBTechDepartment(dept)) {
    return fallback;
  }
  return dept.trim();
}
