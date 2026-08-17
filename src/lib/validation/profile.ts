import { isValidPhoneNumber, PHONE_ERROR_MESSAGES } from "./phone";
import { isValidOptionalEmail, EMAIL_ERROR_MESSAGES } from "./email";
import { UserRole } from "@/types";

export interface ProfileValidationInput {
  displayName: string;
  phoneNumber: string;
  role: UserRole | string;
  // Student Specific
  rollNumber?: string;
  year?: string;
  btechProgramme?: string;
  personalEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  // Faculty Specific
  employeeId?: string;
  designation?: string;
  department?: string;
  expertise?: string;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Universal Client-Side Profile Form Validator
 */
export function validateProfileForm(input: ProfileValidationInput): ProfileValidationResult {
  const errors: Record<string, string> = {};

  // 1. Full Name (Required for all roles)
  if (!input.displayName || !input.displayName.trim()) {
    errors.displayName = "Full name is required.";
  }

  // 2. Mobile Contact Number (Required 10 digits for all roles)
  if (!input.phoneNumber || !input.phoneNumber.trim()) {
    errors.phoneNumber = PHONE_ERROR_MESSAGES.REQUIRED;
  } else if (!isValidPhoneNumber(input.phoneNumber)) {
    errors.phoneNumber = PHONE_ERROR_MESSAGES.INVALID;
  }

  // 3. Student-Specific Fields
  if (input.role === "student") {
    if (!input.rollNumber || !input.rollNumber.trim()) {
      errors.rollNumber = "Student roll number is required.";
    }
    if (!input.year || !input.year.trim()) {
      errors.year = "Please select your year of study.";
    }
    if (!input.btechProgramme || !input.btechProgramme.trim()) {
      errors.btechProgramme = "Please select your B.Tech programme.";
    }

    // Optional Personal Alternate Email
    if (input.personalEmail && input.personalEmail.trim() && !isValidOptionalEmail(input.personalEmail)) {
      errors.personalEmail = EMAIL_ERROR_MESSAGES.INVALID;
    }

    // Optional Emergency Contact Phone
    if (
      input.emergencyContactPhone &&
      input.emergencyContactPhone.trim() &&
      !isValidPhoneNumber(input.emergencyContactPhone)
    ) {
      errors.emergencyContactPhone = PHONE_ERROR_MESSAGES.EMERGENCY_INVALID;
    }
  }

  // 4. Faculty-Specific Fields
  if (input.role === "faculty") {
    if (!input.employeeId || !input.employeeId.trim()) {
      errors.employeeId = "Faculty / Employee ID is required.";
    }
    if (!input.designation || !input.designation.trim()) {
      errors.designation = "Please select your designation.";
    }
    if (!input.btechProgramme || !input.btechProgramme.trim()) {
      errors.btechProgramme = "Please select your B.Tech programme.";
    }

    if (input.personalEmail && input.personalEmail.trim() && !isValidOptionalEmail(input.personalEmail)) {
      errors.personalEmail = EMAIL_ERROR_MESSAGES.INVALID;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
