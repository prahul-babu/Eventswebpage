import { collection, doc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export interface LogAuditParams {
  action: string;
  actorUid?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: "EVENT" | "REGISTRATION" | "USER" | "REPORT" | "SYSTEM";
  targetId?: string;
  details?: Record<string, any>;
}

export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    const user = auth.currentUser;
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(collection(db, "auditLogs"), logId);

    const entry = {
      id: logId,
      action: params.action,
      actorUid: params.actorUid || user?.uid || "system",
      actorName: params.actorName || user?.displayName || "Campus User",
      actorEmail: params.actorEmail || user?.email || "system@apollouniversity.edu.in",
      actorRole: params.actorRole || "USER",
      targetType: params.targetType || "SYSTEM",
      targetId: params.targetId || "",
      details: params.details || {},
      timestamp: new Date(),
    };

    await setDoc(logRef, entry);
  } catch (err) {
    console.warn("[logAuditEvent] notice:", err);
  }
}
