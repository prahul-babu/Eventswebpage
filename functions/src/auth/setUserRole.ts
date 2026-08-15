import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { notify } from "../notifications/service";
import type { SetUserRolePayload, UserRole, UserStatus } from "../../../src/types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Cloud Function: setUserRole
 * Admin-only HTTPS callable to grant, approve, suspend, or modify user roles and statuses.
 * Guardrails enforced:
 * - Admin cannot modify their own role or status.
 * - System must always retain at least one ACTIVE administrator.
 */
export const setUserRole = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<SetUserRolePayload>): Promise<{ success: boolean }> => {
    // 1. Admin Verification: Check caller custom claims
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Admin authentication required.");
    }

    const callerUid = request.auth.uid;
    const callerRole = request.auth.token.role;
    if (callerRole !== "admin") {
      console.warn(`[setUserRole] Unauthorized role change attempt by: ${callerUid}`);
      throw new HttpsError("permission-denied", "Only campus administrators can assign or update user roles.");
    }

    const data = request.data;
    if (!data || !data.targetUid || !data.role || !data.status) {
      throw new HttpsError("invalid-argument", "Missing required fields: targetUid, role, status.");
    }

    // 2. Guardrail: Admin cannot change their own role or status
    if (data.targetUid === callerUid) {
      throw new HttpsError(
        "failed-precondition",
        "Administrative Safety Guardrail: You cannot alter your own role or account status."
      );
    }

    const validRoles: UserRole[] = ["student", "faculty", "admin"];
    const validStatuses: UserStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];

    if (!validRoles.includes(data.role)) {
      throw new HttpsError("invalid-argument", `Invalid role: ${data.role}`);
    }

    if (!validStatuses.includes(data.status)) {
      throw new HttpsError("invalid-argument", `Invalid status: ${data.status}`);
    }

    const targetUserRef = db.collection("users").doc(data.targetUid);
    const targetUserSnap = await targetUserRef.get();

    if (!targetUserSnap.exists) {
      throw new HttpsError("not-found", `User document with UID ${data.targetUid} not found.`);
    }

    const targetData = targetUserSnap.data();
    const previousRole = targetData?.role;
    const previousStatus = targetData?.status;

    // 3. Guardrail: Ensure at least one ACTIVE admin remains in the system
    if (previousRole === "admin" && (data.role !== "admin" || data.status !== "ACTIVE")) {
      const activeAdminsSnap = await db
        .collection("users")
        .where("role", "==", "admin")
        .where("status", "==", "ACTIVE")
        .get();

      const activeAdminIds = activeAdminsSnap.docs.map((d) => d.id);
      if (activeAdminIds.length <= 1 && activeAdminIds.includes(data.targetUid)) {
        throw new HttpsError(
          "failed-precondition",
          "Administrative Safety Guardrail: Cannot demote or suspend the last remaining ACTIVE administrator in the system."
        );
      }
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    // 4. Update target user document
    const updatePayload: Record<string, unknown> = {
      role: data.role,
      status: data.status,
      approvedBy: callerUid,
      approvedAt: now,
      updatedAt: now,
    };

    if (data.status === "REJECTED" && data.rejectionReason) {
      updatePayload.rejectionReason = data.rejectionReason;
    } else if (data.status === "ACTIVE") {
      updatePayload.rejectionReason = admin.firestore.FieldValue.delete();
    }

    await targetUserRef.update(updatePayload);

    // 5. Update Firebase custom claims for target user
    await auth.setCustomUserClaims(data.targetUid, {
      role: data.role,
      status: data.status,
    });

    // 6. Write audit log entry
    await db.collection("audit_logs").add({
      action: data.status === "ACTIVE" && previousStatus === "PENDING" ? "USER_APPROVED" : "USER_ROLE_CHANGED",
      actorUid: callerUid,
      actorEmail: request.auth.token.email || "admin@apollo.edu.in",
      actorRole: "admin",
      targetUid: data.targetUid,
      details: {
        targetName: targetData?.displayName || targetData?.name || "User",
        targetEmail: targetData?.email,
        previousRole,
        previousStatus,
        newRole: data.role,
        newStatus: data.status,
        rejectionReason: data.rejectionReason || null,
      },
      timestamp: now,
    });

    // 7. Route notifications through notify() service
    if (data.status === "ACTIVE") {
      await notify({
        userIds: [data.targetUid],
        type: "ROLE_CHANGED",
        title: "Access Approved & Role Assigned",
        body: `Your access request has been approved as ${data.role.toUpperCase()}. Welcome to Apollo Event Hub!`,
        link: "/",
        emailTemplate: "access-approved",
        emailData: {
          recipientName: targetData?.displayName,
          role: data.role,
        },
        priority: "HIGH",
      });
    } else if (data.status === "REJECTED") {
      await notify({
        userIds: [data.targetUid],
        type: "ROLE_CHANGED",
        title: "Access Request Notice",
        body: `Access request was not approved: ${data.rejectionReason || "Credentials could not be verified."}`,
        link: "/login",
        emailTemplate: "access-rejected",
        emailData: {
          recipientName: targetData?.displayName,
          reason: data.rejectionReason,
        },
        priority: "HIGH",
      });
    } else {
      await notify({
        userIds: [data.targetUid],
        type: "ROLE_CHANGED",
        title: "Account Status Updated",
        body: `Your role has been updated to ${data.role} with status ${data.status}.`,
        link: "/",
        priority: "NORMAL",
      });
    }

    return { success: true };
  }
);
