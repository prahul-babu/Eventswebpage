import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export type AuditActionCategory =
  | "AUTHENTICATION"
  | "USER_MANAGEMENT"
  | "EVENT_MANAGEMENT"
  | "REGISTRATION"
  | "APPROVALS"
  | "REPORTS"
  | "PROFILE"
  | "NOTIFICATIONS"
  | "DOCUMENTS"
  | "PAYMENTS"
  | "SECURITY"
  | "SYSTEM";

export type AuditTargetType =
  | "EVENT"
  | "USER"
  | "REGISTRATION"
  | "REPORT"
  | "PAYMENT"
  | "DOCUMENT"
  | "NOTIFICATION"
  | "SYSTEM";

export type AuditStatus = "SUCCESS" | "FAILED" | "WARNING";

export interface ChangedFieldDetail {
  oldValue: any;
  newValue: any;
}

export interface AuditLogRecord {
  id: string;
  timestamp: Date;
  action: string;
  actionCategory: AuditActionCategory;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: "ADMIN" | "FACULTY" | "STUDENT" | "SYSTEM" | string;
  targetType: AuditTargetType;
  targetId: string;
  targetName?: string;
  description: string;
  status: AuditStatus;
  details?: Record<string, any>;
  changedFields?: Record<string, ChangedFieldDetail>;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateAuditLogParams {
  action: string;
  actionCategory?: AuditActionCategory;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: AuditTargetType;
  targetId?: string;
  targetName?: string;
  description?: string;
  status?: AuditStatus;
  details?: Record<string, any>;
  changedFields?: Record<string, ChangedFieldDetail>;
  ipAddress?: string;
  userAgent?: string;
  // Legacy aliases
  actorUid?: string;
  targetUid?: string;
}

/**
 * Infer category from action name
 */
export function inferActionCategory(action: string): AuditActionCategory {
  const upper = action.toUpperCase();
  if (
    upper.includes("LOGIN") ||
    upper.includes("LOGOUT") ||
    upper.includes("SIGNUP") ||
    upper.includes("PASSWORD") ||
    upper.includes("AUTH") ||
    upper.includes("ACCOUNT_LOCK")
  ) {
    return "AUTHENTICATION";
  }
  if (
    upper.includes("USER_ROLE") ||
    upper.includes("USER_STATUS") ||
    upper.includes("USER_CREATED") ||
    upper.includes("USER_DELETED") ||
    upper.includes("ROSTER") ||
    upper.includes("MEMBER")
  ) {
    return "USER_MANAGEMENT";
  }
  if (
    upper.includes("REGISTER") ||
    upper.includes("REGISTRATION") ||
    upper.includes("TICKET") ||
    upper.includes("CHECKIN") ||
    upper.includes("ATTENDANCE")
  ) {
    return "REGISTRATION";
  }
  if (
    upper.includes("APPROV") ||
    upper.includes("REJECT") ||
    upper.includes("FACULTY_APPLICATION")
  ) {
    return "APPROVALS";
  }
  if (upper.includes("REPORT") || upper.includes("ACCREDITATION")) {
    return "REPORTS";
  }
  if (upper.includes("PROFILE")) {
    return "PROFILE";
  }
  if (
    upper.includes("NOTIFICATION") ||
    upper.includes("ANNOUNCEMENT") ||
    upper.includes("BROADCAST") ||
    upper.includes("MESSAGE")
  ) {
    return "NOTIFICATIONS";
  }
  if (
    upper.includes("DOCUMENT") ||
    upper.includes("ATTACHMENT") ||
    upper.includes("FILE") ||
    upper.includes("MEDIA")
  ) {
    return "DOCUMENTS";
  }
  if (
    upper.includes("PAYMENT") ||
    upper.includes("REFUND") ||
    upper.includes("BUDGET") ||
    upper.includes("TRANSACTION")
  ) {
    return "PAYMENTS";
  }
  if (upper.includes("SECURITY") || upper.includes("PERMISSION")) {
    return "SECURITY";
  }
  if (upper.includes("EVENT")) {
    return "EVENT_MANAGEMENT";
  }
  return "SYSTEM";
}

/**
 * Generate a friendly human-readable description for an audit action
 */
export function generateAuditDescription(params: {
  action: string;
  actorName: string;
  actorRole: string;
  targetName?: string;
  targetType?: string;
}): string {
  const { action, actorName, actorRole, targetName, targetType } = params;
  const targetLabel = targetName || (targetType ? targetType.toLowerCase() : "record");

  switch (action) {
    case "LOGIN":
      return `${actorName} logged in successfully as ${actorRole}.`;
    case "LOGOUT":
      return `${actorName} logged out of the session.`;
    case "SIGNUP":
      return `New user ${actorName} registered an institutional account.`;
    case "LOGIN_FAILED":
      return `Failed authentication attempt for account.`;
    case "EVENT_CREATED":
      return `${actorName} created event proposal: "${targetLabel}".`;
    case "EVENT_UPDATED":
      return `${actorName} updated event details for "${targetLabel}".`;
    case "EVENT_APPROVED":
      return `${actorName} (${actorRole}) approved event "${targetLabel}".`;
    case "EVENT_REJECTED":
      return `${actorName} (${actorRole}) rejected event "${targetLabel}".`;
    case "EVENT_DELETED":
      return `${actorName} (${actorRole}) permanently deleted event "${targetLabel}".`;
    case "EVENT_CANCELLED":
      return `${actorName} cancelled event "${targetLabel}".`;
    case "STUDENT_REGISTERED_EVENT":
      return `${actorName} confirmed registration for "${targetLabel}".`;
    case "STUDENT_CANCELLED_REGISTRATION":
      return `${actorName} cancelled registration booking for "${targetLabel}".`;
    case "PROFILE_UPDATED":
      return `${actorName} updated their institutional profile records.`;
    case "USER_ROLE_CHANGED":
      return `${actorName} modified user role / status for "${targetLabel}".`;
    case "POST_EVENT_REPORT_SUBMITTED":
      return `${actorName} submitted post-event outcome report for "${targetLabel}".`;
    case "POST_EVENT_REPORT_APPROVED":
      return `${actorName} approved post-event outcome report for "${targetLabel}".`;
    case "DOCUMENT_UPLOADED":
      return `${actorName} uploaded document attachment: "${targetLabel}".`;
    case "DOCUMENT_DELETED":
      return `${actorName} removed document attachment: "${targetLabel}".`;
    case "NOTIFICATION_SENT":
      return `${actorName} broadcasted event update for "${targetLabel}".`;
    case "ADMIN_FACULTY_NOTIFICATION_SENT":
      return `${actorName} sent administrative notification to faculty member.`;
    case "PAYMENT_SUCCESSFUL":
      return `${actorName} completed registration payment for "${targetLabel}".`;
    case "PAYMENT_REFUNDED":
      return `${actorName} processed refund for "${targetLabel}".`;
    default:
      return `${actorName} performed action ${action.replace(/_/g, " ").toLowerCase()}${
        targetName ? ` on "${targetName}"` : ""
      }.`;
  }
}

/**
 * Universal Centralized Audit Logging Service
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<AuditLogRecord | null> {
  try {
    const user = auth.currentUser;
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(collection(db, "auditLogs"), logId);

    const actorId = params.actorId || params.actorUid || user?.uid || "system";
    const actorName = params.actorName || user?.displayName || "Campus User";
    const actorEmail = params.actorEmail || user?.email || "system@apollouniversity.edu.in";
    const actorRole = (params.actorRole || "STUDENT").toUpperCase();

    const category = params.actionCategory || inferActionCategory(params.action);
    const targetType = params.targetType || "SYSTEM";
    const targetId = params.targetId || params.targetUid || "";
    const targetName = params.targetName || "";
    const status: AuditStatus = params.status || "SUCCESS";

    const description =
      params.description ||
      generateAuditDescription({
        action: params.action,
        actorName,
        actorRole,
        targetName,
        targetType,
      });

    const userAgent =
      params.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "Web Client");

    const record: AuditLogRecord = {
      id: logId,
      timestamp: new Date(),
      action: params.action,
      actionCategory: category,
      actorId,
      actorName,
      actorEmail,
      actorRole,
      targetType,
      targetId,
      targetName,
      description,
      status,
      details: params.details || {},
      changedFields: params.changedFields,
      userAgent,
      ipAddress: params.ipAddress,
    };

    const firestorePayload = {
      ...record,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    // Write to auditLogs
    await setDoc(logRef, firestorePayload);

    return record;
  } catch (err) {
    console.warn("[createAuditLog] Notice:", err);
    return null;
  }
}

/**
 * Alias for backward compatibility across existing files
 */
export const logAuditEvent = createAuditLog;
