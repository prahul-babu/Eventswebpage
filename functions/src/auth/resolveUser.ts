import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type { ResolveUserResponse, UserRole, UserStatus, AllowlistEntry } from "../../../src/types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Normalizes email address to a safe Firestore document ID key
 */
export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/**
 * Validates domain against Firestore settings/config or default whitelist
 */
async function checkAllowedDomain(email: string): Promise<boolean> {
  const defaultAllowedDomains = [
    "apollouniversity.edu.in",
    "student.apollouniversity.edu.in",
    "apollo.edu.in",
  ];

  try {
    const configSnap = await db.collection("settings").doc("config").get();
    let allowedDomains = defaultAllowedDomains;

    if (configSnap.exists) {
      const data = configSnap.data();
      if (Array.isArray(data?.allowedEmailDomains) && data.allowedEmailDomains.length > 0) {
        allowedDomains = data.allowedEmailDomains.map((d: string) => d.trim().toLowerCase());
      }
    }

    const domain = email.split("@")[1]?.toLowerCase();
    return domain ? allowedDomains.includes(domain) : false;
  } catch (err) {
    console.warn("[resolveUser] Error reading settings/config, using default domains:", err);
    const domain = email.split("@")[1]?.toLowerCase();
    return domain ? defaultAllowedDomains.includes(domain) : false;
  }
}

/**
 * Cloud Function: resolveUser
 * Resolves user identity post-Microsoft login, handles roster auto-provisioning,
 * and sets custom claims.
 */
export const resolveUser = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest): Promise<ResolveUserResponse> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication is required to resolve user.");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email || "";
    const displayName = request.auth.token.name || email.split("@")[0] || "Campus Member";

    if (!email) {
      throw new HttpsError("invalid-argument", "Authenticated account lacks a valid email address.");
    }

    // 1. Enforce domain check
    const isDomainAllowed = await checkAllowedDomain(email);
    if (!isDomainAllowed) {
      console.warn(`[resolveUser] Rejected unauthorized domain email: ${email}`);
      throw new HttpsError(
        "permission-denied",
        "Please sign in with your official Apollo University account."
      );
    }

    const userDocRef = db.collection("users").doc(uid);
    const userSnap = await userDocRef.get();

    // 2. Existing user: refresh lastLoginAt and return current state
    if (userSnap.exists) {
      const userData = userSnap.data();
      const role = (userData?.role as UserRole) || "student";
      const status = (userData?.status as UserStatus) || "PENDING";

      await userDocRef.update({
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Ensure claims match current document state
      await auth.setCustomUserClaims(uid, { role, status });

      return {
        state: "ready",
        role,
        status,
      };
    }

    // 3. New User: Check institutional allowlist/roster
    const emailKey = normalizeEmailKey(email);
    const allowlistSnap = await db.collection("allowlist").doc(emailKey).get();

    if (allowlistSnap.exists) {
      const roster = allowlistSnap.data() as AllowlistEntry;
      const role = roster.role || "student";
      const status: UserStatus = roster.active !== false ? "ACTIVE" : "SUSPENDED";

      const now = admin.firestore.FieldValue.serverTimestamp();
      const newUserDoc = {
        uid,
        email: email.toLowerCase(),
        displayName: roster.displayName || displayName,
        role,
        status,
        department: roster.department || "General Administration",
        rollNumber: roster.rollNumber || null,
        employeeId: roster.employeeId || null,
        designation: roster.designation || null,
        onboardingCompleted: true,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      };

      await userDocRef.set(newUserDoc);

      // Set custom claims for Firebase Auth token
      await auth.setCustomUserClaims(uid, { role, status });

      // Write audit log entry
      await db.collection("audit_logs").add({
        action: "USER_AUTO_PROVISIONED",
        actorUid: "system",
        actorEmail: "system@apollo.edu.in",
        actorRole: "system",
        targetUid: uid,
        details: {
          email,
          role,
          status,
          department: roster.department,
          source: "allowlist_roster",
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.info(`[resolveUser] Auto-provisioned user ${email} with role: ${role}`);

      return {
        state: "ready",
        role,
        status,
      };
    }

    // 4. On miss: Return onboarding required state
    console.info(`[resolveUser] Onboarding required for new user: ${email}`);
    return {
      state: "onboarding_required",
    };
  }
);
