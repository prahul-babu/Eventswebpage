export interface ReportValidationInput {
  summary?: string;
  objectives?: string[];
  actualAttendance?: number | string;
  budgetAllocated?: number | string;
  totalSpent?: number | string;
  feedbackSummary?: string;
}

export interface ReportValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Universal Post-Event Outcome Report Validator
 */
export function validateReportForm(input: ReportValidationInput): ReportValidationResult {
  const errors: Record<string, string> = {};

  // 1. Executive Summary
  if (!input.summary || !input.summary.trim()) {
    errors.summary = "Executive summary is required.";
  }

  // 2. Academic Objectives
  if (!input.objectives || input.objectives.filter((o) => o && o.trim()).length === 0) {
    errors.objectives = "At least one academic objective is required.";
  }

  // 3. Actual Attendance
  if (input.actualAttendance === undefined || input.actualAttendance === null || input.actualAttendance === "") {
    errors.actualAttendance = "Verified attendance count is required.";
  } else {
    const attNum = Number(input.actualAttendance);
    if (isNaN(attNum) || attNum < 0) {
      errors.actualAttendance = "Attendance count cannot be negative.";
    }
  }

  // 4. Budget & Financial Statement
  if (input.budgetAllocated !== undefined && input.budgetAllocated !== null && input.budgetAllocated !== "") {
    const num = Number(input.budgetAllocated);
    if (isNaN(num) || num < 0) {
      errors.budgetAllocated = "Allocated budget cannot be negative.";
    }
  }

  if (input.totalSpent !== undefined && input.totalSpent !== null && input.totalSpent !== "") {
    const num = Number(input.totalSpent);
    if (isNaN(num) || num < 0) {
      errors.totalSpent = "Total expenditure cannot be negative.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
