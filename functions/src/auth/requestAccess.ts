import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { notify } from "../notifications/service";
import { assertRateLimit } from "../utils/rateLimiter";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

export interface RequestAccessPayload {
  requestedRole: "student" | "faculty";
  displayName: string;
  department: string;
  phoneNumber?: string;
  rollNumber?: string;
  year?: string;
  section?: string;
  employeeId?: string;
  designation?: string;
}

/**
 * Cloud Function: requestAccess
 * Processes student / faculty self-onboarding requests, sets status PENDING,
 * and notifies campus administrators via unified notification service.
 */
export const requestAccess = onCall(
  { region: "asia-south1" },
  async (request: CallableRequest<RequestAccessPayload>): Promise<{ success: boolean; status: string }> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Authentication is required to request campus access.");
    }

    const uid = request.auth.uid;
    const email = (request.auth.token.email || "").toLowerCase();
    const data = request.data;

    if (!data) {
      throw new HttpsError("invalid-argument", "Missing request payload.");
    }

    // Rate Limiter: Max 3 requests per 60s per user
    await assertRateLimit(uid, "requestAccess", 3, 60);

    // 1. Rejects 'admin' requests outright
    if (data.requestedRole !== "student" && data.requestedRole !== "faculty") {
      throw new HttpsError(
        "invalid-argument",
        "Invalid requested role. Only 'student' and 'faculty' roles can be requested."
      );
    }

    if (!data.displayName || !data.department) {
      throw new HttpsError("invalid-argument", "Full name and Department are required.");
    }

    // Conditional role validation
    if (data.requestedRole === "student" && (!data.rollNumber || data.rollNumber.trim().length < 3)) {
      throw new HttpsError("invalid-argument", "University Roll Number is required for students.");
    }

    if (data.requestedRole === "faculty" && (!data.employeeId || data.employeeId.trim().length < 3)) {
      throw new HttpsError("invalid-argument", "Employee ID is required for faculty.");
    }

    const userDocRef = db.collection("users").doc(uid);
    const existingDoc = await userDocRef.get();

    // Idempotency
    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      const currentStatus = existingData?.status || "PENDING";
      return {
        success: true,
        status: currentStatus,
      };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    const userDocument = {
      uid,
      email,
      displayName: data.displayName.trim(),
      role: data.requestedRole,
      status: "PENDING",
      department: data.department.trim(),
      phoneNumber: data.phoneNumber ? data.phoneNumber.trim() : null,
      phone: data.phoneNumber ? data.phoneNumber.trim() : null,
      
      // Student details
      rollNumber: data.requestedRole === "student" && data.rollNumber ? data.rollNumber.trim() : null,
      year: data.requestedRole === "student" && data.year ? data.year : null,
      section: data.requestedRole === "student" && data.section ? data.section : null,

      // Faculty details
      employeeId: data.requestedRole === "faculty" && data.employeeId ? data.employeeId.trim() : null,
      designation: data.requestedRole === "faculty" && data.designation ? data.designation : null,

      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    };

    // 2. Create users/{uid} document
    await userDocRef.set(userDocument);

    // 3. Set custom claims { role: requestedRole, status: 'PENDING' }
    await auth.setCustomUserClaims(uid, {
      role: data.requestedRole,
      status: "PENDING",
    });

    // 4. Write audit log entry 'ACCESS_REQUESTED'
    await db.collection("audit_logs").add({
      action: "ACCESS_REQUESTED",
      actorUid: uid,
      actorEmail: email,
      actorRole: data.requestedRole,
      targetUid: uid,
      details: {
        requestedRole: data.requestedRole,
        department: data.department,
        rollNumber: data.rollNumber || null,
        employeeId: data.employeeId || null,
      },
      timestamp: now,
    });

    // 5. Notify Admins via notify() service
    await notify({
      role: "admin",
      type: "ACCESS_REQUESTED" as any,
      title: "New Campus Access Request",
      body: `${data.displayName} (${email}) requested ${data.requestedRole} access for ${data.department}.`,
      link: "/admin/users/requests",
      emailTemplate: "access-requested-admin",
      emailData: {
        userName: data.displayName,
        userEmail: email,
        requestedRole: data.requestedRole,
        department: data.department,
        rollNumber: data.rollNumber,
        employeeId: data.employeeId,
      },
      priority: "HIGH",
    });

    return {
      success: true,
      status: "PENDING",
    };
  }
);
