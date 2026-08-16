import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface RosterEntry {
  email: string;
  name: string;
  role: "student" | "faculty";
  department: string;
  rollNumber?: string;
  employeeId?: string;
  year?: string;
  section?: string;
}

export interface ImportRosterPayload {
  records: RosterEntry[];
}

export const importRosterAllowlist = onCall(
  { region: "asia-south1", timeoutSeconds: 300, memory: "512MiB" },
  async (request: CallableRequest<ImportRosterPayload>) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Admin authentication required.");
    }

    const callerRole = request.auth.token.role;
    if (callerRole !== "admin") {
      const userDoc = await db.collection("users").doc(request.auth.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Only campus administrators can import rosters.");
      }
    }

    const { records } = request.data || {};
    if (!records || !Array.isArray(records) || records.length === 0) {
      throw new HttpsError("invalid-argument", "Please provide a valid array of roster records.");
    }

    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    const importedBy = request.auth.uid;
    const adminEmail = request.auth.token.email || "admin@apollo.edu.in";

    let importedCount = 0;
    let skippedCount = 0;
    const errors: { email: string; reason: string }[] = [];

    // Process in batches of 400 (Firestore maximum batch size is 500)
    const BATCH_SIZE = 400;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const chunk = records.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const entry of chunk) {
        if (!entry.email || !entry.email.includes("@") || !entry.name || !entry.role) {
          skippedCount++;
          errors.push({ email: entry.email || "unknown", reason: "Missing email, name, or role" });
          continue;
        }

        const FORBIDDEN_NON_BTECH = [
          "school of management",
          "school of health sciences",
          "general administration",
          "management",
          "health sciences",
        ];
        const dept = (entry.department || "").toLowerCase();
        if (FORBIDDEN_NON_BTECH.some((f) => dept.includes(f))) {
          skippedCount++;
          errors.push({ email: entry.email, reason: `Non-B.Tech department "${entry.department}" is not permitted` });
          continue;
        }

        const normalizedEmail = entry.email.trim().toLowerCase();
        const emailKey = normalizedEmail.replace(/[@.]/g, "_");
        const docRef = db.collection("allowlist").doc(emailKey);

        batch.set(
          docRef,
          {
            email: normalizedEmail,
            name: entry.name.trim(),
            role: entry.role,
            department: entry.department || (entry.role === "faculty" ? "Department of Computer Science & Engineering" : "B.Tech. Computer Science and Engineering"),
            rollNumber: entry.rollNumber || null,
            employeeId: entry.employeeId || null,
            year: entry.year || null,
            section: entry.section || null,
            importedBy,
            importedAt: serverNow,
            updatedAt: serverNow,
          },
          { merge: true }
        );

        importedCount++;
      }

      await batch.commit();
    }

    // Write audit log for roster import
    await db.collection("audit_logs").add({
      action: "ROSTER_IMPORTED",
      actorUid: importedBy,
      actorEmail: adminEmail,
      actorRole: "admin",
      targetUid: "allowlist",
      details: {
        totalSubmitted: records.length,
        importedCount,
        skippedCount,
      },
      timestamp: serverNow,
    });

    return {
      success: true,
      totalSubmitted: records.length,
      importedCount,
      skippedCount,
      errors,
    };
  }
);
