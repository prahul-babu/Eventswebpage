import { z } from "zod";
import { USER_ROLES, USER_STATUSES, ACADEMIC_YEARS, ACADEMIC_SECTIONS, FACULTY_DESIGNATIONS } from "@/types/user";
import { isForbiddenNonBTechDepartment } from "@/config/departments";

export const userRoleSchema = z.enum(USER_ROLES);
export const userStatusSchema = z.enum(USER_STATUSES);
export const academicYearSchema = z.enum(ACADEMIC_YEARS);
export const academicSectionSchema = z.enum(ACADEMIC_SECTIONS);
export const facultyDesignationSchema = z.enum(FACULTY_DESIGNATIONS);
export const departmentSchema = z
  .string()
  .min(2, "Department is required")
  .refine(
    (dept) => !isForbiddenNonBTechDepartment(dept),
    {
      message: "Only B.Tech / School of Technology departments and specializations are permitted.",
    }
  );

export const onboardingRoleSelectionSchema = z.object({
  role: z.enum(["student", "faculty"], {
    required_error: "Please select whether you are a Student or a Faculty Member",
  }),
});

/**
 * Onboarding Access Request Schema validated across client and functions
 */
export const requestAccessSchema = z
  .object({
    requestedRole: z.enum(["student", "faculty"], {
      required_error: "Please select either student or faculty role",
    }),
    displayName: z.string().min(2, "Full name must be at least 2 characters").max(100),
    department: departmentSchema,
    phoneNumber: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number")
      .optional()
      .or(z.literal("")),
    
    // Student fields
    rollNumber: z.string().optional(),
    year: z.string().optional(),
    section: z.string().optional(),

    // Faculty fields
    employeeId: z.string().optional(),
    designation: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.requestedRole === "student") {
        return Boolean(data.rollNumber && data.rollNumber.trim().length >= 3);
      }
      return true;
    },
    {
      message: "University Roll Number is required for students (e.g. AP21CS001)",
      path: ["rollNumber"],
    }
  )
  .refine(
    (data) => {
      if (data.requestedRole === "faculty") {
        return Boolean(data.employeeId && data.employeeId.trim().length >= 3);
      }
      return true;
    },
    {
      message: "Employee ID is required for faculty (e.g. FAC-101)",
      path: ["employeeId"],
    }
  )
  .refine(
    (data) => {
      if (data.requestedRole === "faculty") {
        return Boolean(data.designation && data.designation.trim().length >= 2);
      }
      return true;
    },
    {
      message: "Designation is required for faculty members",
      path: ["designation"],
    }
  );

/**
 * Admin role assignment schema
 */
export const setUserRoleSchema = z.object({
  targetUid: z.string().min(1, "Target UID is required"),
  role: userRoleSchema,
  status: userStatusSchema,
  rejectionReason: z.string().optional(),
});

export const updateUserProfileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  phoneNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  department: departmentSchema.optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  photoURL: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type RequestAccessFormValues = z.infer<typeof requestAccessSchema>;
export type SetUserRoleFormValues = z.infer<typeof setUserRoleSchema>;
export type UpdateUserProfileFormValues = z.infer<typeof updateUserProfileSchema>;
