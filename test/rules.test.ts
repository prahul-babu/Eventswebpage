import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

describe("Firestore Security Rules Matrix Audit (Module 14)", () => {
  let testEnv: RulesTestEnvironment;

  // Personas
  const studentUid = "usr_student_active";
  const pendingUid = "usr_student_pending";
  const facultyOwnerUid = "usr_faculty_owner";
  const facultyOtherUid = "usr_faculty_other";
  const adminUid = "usr_admin_active";

  const eventDraftId = "ev_draft_01";
  const eventPublishedId = "ev_published_01";
  const registrationId = "reg_student_01";
  const reportId = "rep_event_01";

  beforeAll(async () => {
    const rulesPath = path.resolve(__dirname, "../firestore.rules");
    const rules = fs.readFileSync(rulesPath, "utf8");

    testEnv = await initializeTestEnvironment({
      projectId: "apollo-event-hub-test",
      firestore: {
        rules,
        host: "127.0.0.1",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();

      // Seed Database with Personas and baseline entities
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();

        // 1. Users
        await setDoc(doc(adminDb, "users", studentUid), {
          uid: studentUid,
          email: "student@apollouniversity.edu.in",
          displayName: "Active Student",
          role: "student",
          status: "ACTIVE",
        });

        await setDoc(doc(adminDb, "users", pendingUid), {
          uid: pendingUid,
          email: "pending@apollouniversity.edu.in",
          displayName: "Pending Applicant",
          role: "student",
          status: "PENDING",
        });

        await setDoc(doc(adminDb, "users", facultyOwnerUid), {
          uid: facultyOwnerUid,
          email: "faculty1@apollouniversity.edu.in",
          displayName: "Faculty Host",
          role: "faculty",
          status: "ACTIVE",
        });

        await setDoc(doc(adminDb, "users", facultyOtherUid), {
          uid: facultyOtherUid,
          email: "faculty2@apollouniversity.edu.in",
          displayName: "Faculty Other",
          role: "faculty",
          status: "ACTIVE",
        });

        await setDoc(doc(adminDb, "users", adminUid), {
          uid: adminUid,
          email: "admin@apollouniversity.edu.in",
          displayName: "Campus Admin",
          role: "admin",
          status: "ACTIVE",
        });

        // 2. Events
        await setDoc(doc(adminDb, "events", eventDraftId), {
          id: eventDraftId,
          title: "Draft Hackathon",
          status: "DRAFT",
          organiserId: facultyOwnerUid,
          capacity: 100,
        });

        await setDoc(doc(adminDb, "events", eventPublishedId), {
          id: eventPublishedId,
          title: "Annual Tech Fest 2026",
          status: "PUBLISHED",
          organiserId: facultyOwnerUid,
          capacity: 500,
        });

        // 3. Registrations
        await setDoc(doc(adminDb, "registrations", registrationId), {
          id: registrationId,
          eventId: eventPublishedId,
          userId: studentUid,
          status: "CONFIRMED",
          ticketCode: "APL-TECH-001",
          checkedIn: false,
        });

        // 4. Reports
        await setDoc(doc(adminDb, "reports", eventPublishedId), {
          eventId: eventPublishedId,
          organiserId: facultyOwnerUid,
          status: "APPROVED",
          eventTitle: "Annual Tech Fest 2026",
        });

        // 5. Settings
        await setDoc(doc(adminDb, "settings", "config"), {
          academicYear: "2025-26",
          maintenanceMode: false,
        });

        // 6. Audit Logs
        await setDoc(doc(adminDb, "audit_logs", "log_001"), {
          action: "TEST_ACTION",
          actorUid: adminUid,
        });
      });
    }
  });

  describe("1. Unauthenticated Persona", () => {
    it("denies unauthenticated read to any collection", async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, "users", studentUid)));
      await assertFails(getDoc(doc(db, "events", eventPublishedId)));
      await assertFails(getDoc(doc(db, "registrations", registrationId)));
      await assertFails(getDoc(doc(db, "audit_logs", "log_001")));
    });

    it("denies unauthenticated writes anywhere", async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(setDoc(doc(db, "events", "unauth_event"), { title: "Spam" }));
    });
  });

  describe("2. PENDING User Persona", () => {
    it("allows pending user to read their own user record", async () => {
      const db = testEnv.authenticatedContext(pendingUid, { role: "student", status: "PENDING" }).firestore();
      await assertSucceeds(getDoc(doc(db, "users", pendingUid)));
    });

    it("denies pending user from reading published events or other users", async () => {
      const db = testEnv.authenticatedContext(pendingUid, { role: "student", status: "PENDING" }).firestore();
      await assertFails(getDoc(doc(db, "events", eventPublishedId)));
      await assertFails(getDoc(doc(db, "users", studentUid)));
    });

    it("denies pending user from modifying role or status", async () => {
      const db = testEnv.authenticatedContext(pendingUid, { role: "student", status: "PENDING" }).firestore();
      await assertFails(updateDoc(doc(db, "users", pendingUid), { role: "admin", status: "ACTIVE" }));
    });
  });

  describe("3. Active Student Persona", () => {
    it("allows student to read published events and own registrations", async () => {
      const db = testEnv.authenticatedContext(studentUid, { role: "student", status: "ACTIVE" }).firestore();
      await assertSucceeds(getDoc(doc(db, "events", eventPublishedId)));
      await assertSucceeds(getDoc(doc(db, "registrations", registrationId)));
    });

    it("denies student from reading draft events of faculty", async () => {
      const db = testEnv.authenticatedContext(studentUid, { role: "student", status: "ACTIVE" }).firestore();
      await assertFails(getDoc(doc(db, "events", eventDraftId)));
    });

    it("denies student from creating events or reading audit logs", async () => {
      const db = testEnv.authenticatedContext(studentUid, { role: "student", status: "ACTIVE" }).firestore();
      await assertFails(
        setDoc(doc(db, "events", "student_event"), {
          title: "Unauthorized Event",
          organiserId: studentUid,
          status: "DRAFT",
        })
      );
      await assertFails(getDoc(doc(db, "audit_logs", "log_001")));
    });
  });

  describe("4. Faculty (Resource Owner vs Non-Owner)", () => {
    it("allows faculty owner to create DRAFT events and read their draft", async () => {
      const db = testEnv.authenticatedContext(facultyOwnerUid, { role: "faculty", status: "ACTIVE" }).firestore();
      await assertSucceeds(getDoc(doc(db, "events", eventDraftId)));
      await assertSucceeds(
        setDoc(doc(db, "events", "ev_faculty_new"), {
          title: "New AI Workshop",
          organiserId: facultyOwnerUid,
          status: "DRAFT",
        })
      );
    });

    it("denies faculty from creating PUBLISHED events directly (must go through DRAFT / Approval)", async () => {
      const db = testEnv.authenticatedContext(facultyOwnerUid, { role: "faculty", status: "ACTIVE" }).firestore();
      await assertFails(
        setDoc(doc(db, "events", "ev_bypass_pub"), {
          title: "Bypassed Event",
          organiserId: facultyOwnerUid,
          status: "PUBLISHED",
        })
      );
    });

    it("denies other faculty from reading or modifying another faculty member's draft event", async () => {
      const db = testEnv.authenticatedContext(facultyOtherUid, { role: "faculty", status: "ACTIVE" }).firestore();
      await assertFails(getDoc(doc(db, "events", eventDraftId)));
      await assertFails(updateDoc(doc(db, "events", eventDraftId), { title: "Hijacked Title" }));
    });
  });

  describe("5. Administrator Persona", () => {
    it("allows admin to read all events, settings, reports, and audit logs", async () => {
      const db = testEnv.authenticatedContext(adminUid, { role: "admin", status: "ACTIVE" }).firestore();
      await assertSucceeds(getDoc(doc(db, "events", eventDraftId)));
      await assertSucceeds(getDoc(doc(db, "settings", "config")));
      await assertSucceeds(getDoc(doc(db, "reports", eventPublishedId)));
      await assertSucceeds(getDoc(doc(db, "audit_logs", "log_001")));
    });

    it("allows admin to update system settings", async () => {
      const db = testEnv.authenticatedContext(adminUid, { role: "admin", status: "ACTIVE" }).firestore();
      await assertSucceeds(updateDoc(doc(db, "settings", "config"), { maintenanceMode: true }));
    });

    it("denies admin from modifying or deleting audit logs client-side (Immutable Audit Trail)", async () => {
      const db = testEnv.authenticatedContext(adminUid, { role: "admin", status: "ACTIVE" }).firestore();
      await assertFails(deleteDoc(doc(db, "audit_logs", "log_001")));
      await assertFails(updateDoc(doc(db, "audit_logs", "log_001"), { action: "MODIFIED" }));
    });
  });

  describe("6. Server-Side Restricted Collections", () => {
    it("denies all client-side writes to mail queue and processed_webhooks", async () => {
      const db = testEnv.authenticatedContext(adminUid, { role: "admin", status: "ACTIVE" }).firestore();
      await assertFails(setDoc(doc(db, "mail", "spam_mail"), { to: ["test@apollo.edu.in"] }));
      await assertFails(setDoc(doc(db, "processed_webhooks", "evt_123"), { processed: true }));
    });
  });
});
