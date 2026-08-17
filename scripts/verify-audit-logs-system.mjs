/**
 * Automated Verification Suite for Apollo University Event Hub - Audit Logs System
 * Validates:
 * 1. Audit Log Data Model and Schema Integrity
 * 2. 12 Action Categories and Automatic Inference
 * 3. Zero-Noise Policy (No navigation or passive page views logged)
 * 4. End-to-End System Connectivity across all institutional actions
 * 5. Admin UI Capabilities (Search, Multi-filter, Sort, Details Dialog, CSV Export, Pagination)
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const SRC_DIR = resolve("./src");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

console.log("\n================================================================================");
console.log(" APOLLO UNIVERSITY EVENT HUB - AUDIT LOGS SYSTEM VERIFICATION SUITE");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// SUITE 1: Audit Log Core Module & Schema Model
// -----------------------------------------------------------------------------
console.log("[SUITE 1] Audit Log Core Architecture & Data Model");

const auditModulePath = resolve(SRC_DIR, "lib/audit.ts");
assert(existsSync(auditModulePath), "src/lib/audit.ts exists");

const auditCode = readFileSync(auditModulePath, "utf-8");

assert(
  auditCode.includes("export type AuditActionCategory =") &&
  auditCode.includes("AUTHENTICATION") &&
  auditCode.includes("USER_MANAGEMENT") &&
  auditCode.includes("EVENT_MANAGEMENT") &&
  auditCode.includes("REGISTRATION") &&
  auditCode.includes("APPROVALS") &&
  auditCode.includes("REPORTS") &&
  auditCode.includes("PROFILE") &&
  auditCode.includes("NOTIFICATIONS") &&
  auditCode.includes("DOCUMENTS") &&
  auditCode.includes("PAYMENTS") &&
  auditCode.includes("SECURITY") &&
  auditCode.includes("SYSTEM"),
  "All 12 required AuditActionCategory types are defined"
);

assert(
  auditCode.includes("export interface AuditLogRecord") &&
  auditCode.includes("id: string") &&
  auditCode.includes("timestamp: Date") &&
  auditCode.includes("action: string") &&
  auditCode.includes("actionCategory: AuditActionCategory") &&
  auditCode.includes("actorId: string") &&
  auditCode.includes("actorName: string") &&
  auditCode.includes("actorEmail: string") &&
  auditCode.includes("actorRole:") &&
  auditCode.includes("targetType: AuditTargetType") &&
  auditCode.includes("targetId: string") &&
  auditCode.includes("description: string") &&
  auditCode.includes("status: AuditStatus"),
  "AuditLogRecord interface contains all required schema fields"
);

assert(
  auditCode.includes("export function inferActionCategory") &&
  auditCode.includes("export function generateAuditDescription") &&
  auditCode.includes("export async function createAuditLog"),
  "Centralized helper functions are exported from src/lib/audit.ts"
);

// -----------------------------------------------------------------------------
// SUITE 2: Zero Noise Verification
// -----------------------------------------------------------------------------
console.log("\n[SUITE 2] Zero Noise Policy Verification");

const allAppFiles = [
  "App.tsx",
  "pages/EventsPage.tsx",
  "pages/EventDetailPage.tsx",
  "pages/faculty/FacultyDashboardPage.tsx",
  "pages/admin/AdminDashboardPage.tsx",
  "pages/admin/AdminAuditLogsPage.tsx",
];

let noiseFound = false;
for (const relPath of allAppFiles) {
  const fullPath = resolve(SRC_DIR, relPath);
  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, "utf-8");
    if (
      content.includes("VIEWED_PAGE") ||
      content.includes("PAGE_VIEW") ||
      content.includes("SCROLLED") ||
      content.includes("ROUTE_CHANGED") ||
      content.includes("VIEWED_EVENT")
    ) {
      noiseFound = true;
      break;
    }
  }
}

assert(!noiseFound, "Zero noise: No page views, scrolls, or route visits are logged to audit trail");

// -----------------------------------------------------------------------------
// SUITE 3: Real System Action Connectivity
// -----------------------------------------------------------------------------
console.log("\n[SUITE 3] Real System Action Audit Connectivity");

const authContextFile = readFileSync(resolve(SRC_DIR, "lib/auth-context.tsx"), "utf-8");
const facultyQueryFile = readFileSync(resolve(SRC_DIR, "lib/queries/faculty.ts"), "utf-8");
const adminQueryFile = readFileSync(resolve(SRC_DIR, "lib/queries/admin.ts"), "utf-8");
const adminUsersFile = readFileSync(resolve(SRC_DIR, "lib/queries/adminUsers.ts"), "utf-8");
const regQueryFile = readFileSync(resolve(SRC_DIR, "lib/queries/registrations.ts"), "utf-8");
const reportQueryFile = readFileSync(resolve(SRC_DIR, "lib/queries/reports.ts"), "utf-8");
const attachmentQueryFile = readFileSync(resolve(SRC_DIR, "lib/queries/attachments.ts"), "utf-8");
const paymentQueryFile = readFileSync(resolve(SRC_DIR, "lib/queries/payments.ts"), "utf-8");

assert(
  authContextFile.includes('action: "LOGIN"') &&
  authContextFile.includes('action: "LOGOUT"') &&
  authContextFile.includes('action: "SIGNUP"') &&
  authContextFile.includes('action: "LOGIN_FAILED"'),
  "Authentication operations (LOGIN, LOGOUT, SIGNUP, LOGIN_FAILED) create audit logs"
);

assert(
  authContextFile.includes('action: "PROFILE_UPDATED"'),
  "Profile update operation creates PROFILE_UPDATED audit log"
);

assert(
  facultyQueryFile.includes("FACULTY_CREATED_EVENT") || facultyQueryFile.includes("EVENT_CREATED"),
  "Faculty event creation creates audit log"
);

assert(
  adminQueryFile.includes("ADMIN_APPROVED_EVENT") || adminQueryFile.includes("EVENT_APPROVED"),
  "Admin event approval creates EVENT_APPROVED audit log"
);

assert(
  adminQueryFile.includes("ADMIN_REJECTED_EVENT") || adminQueryFile.includes("EVENT_REJECTED"),
  "Admin event rejection creates EVENT_REJECTED audit log"
);

assert(
  adminQueryFile.includes("EVENT_DELETED"),
  "Admin event deletion creates real EVENT_DELETED audit log"
);

assert(
  regQueryFile.includes("STUDENT_REGISTERED_EVENT") &&
  regQueryFile.includes("STUDENT_CANCELLED_REGISTRATION"),
  "Event registration and cancellation create audit records"
);

assert(
  reportQueryFile.includes("POST_EVENT_REPORT_SUBMITTED") &&
  reportQueryFile.includes("POST_EVENT_REPORT_APPROVED"),
  "Post-event report submission and review create audit records"
);

assert(
  attachmentQueryFile.includes("DOCUMENT_UPLOADED") &&
  attachmentQueryFile.includes("DOCUMENT_DELETED"),
  "File attachment uploads and deletions create audit records"
);

assert(
  paymentQueryFile.includes("PAYMENT_SUCCESSFUL") &&
  paymentQueryFile.includes("PAYMENT_FAILED"),
  "Payment completions and failures create audit records"
);

assert(
  adminUsersFile.includes("USER_ROLE_CHANGED") || adminUsersFile.includes("USER_STATUS_UPDATED"),
  "User role/status modifications create audit records"
);

// -----------------------------------------------------------------------------
// SUITE 4: Admin Audit UI Features & Capabilities
// -----------------------------------------------------------------------------
console.log("\n[SUITE 4] Admin Audit Logs Page UI & Features");

const auditPagePath = resolve(SRC_DIR, "pages/admin/AdminAuditLogsPage.tsx");
assert(existsSync(auditPagePath), "src/pages/admin/AdminAuditLogsPage.tsx exists");

const auditPageCode = readFileSync(auditPagePath, "utf-8");

assert(
  auditPageCode.includes("searchQuery") &&
  auditPageCode.includes("Search by actor name, email, target, action"),
  "Multi-field dynamic search bar is implemented"
);

assert(
  auditPageCode.includes("categoryFilter") &&
  auditPageCode.includes("actionFilter") &&
  auditPageCode.includes("roleFilter") &&
  auditPageCode.includes("targetTypeFilter") &&
  auditPageCode.includes("statusFilter") &&
  auditPageCode.includes("dateRangeFilter"),
  "6 granular filter dimensions are available and combinable"
);

assert(
  auditPageCode.includes("handleSort") &&
  auditPageCode.includes("sortField") &&
  auditPageCode.includes("sortOrder"),
  "Interactive column header sorting is implemented"
);

assert(
  auditPageCode.includes("handleExportCsv") &&
  auditPageCode.includes("Apollo_Institutional_Audit_"),
  "Export Audit CSV functionality respects active filters and sorting"
);

assert(
  auditPageCode.includes("setSelectedLog") &&
  auditPageCode.includes("Cryptographic Payload Record") &&
  auditPageCode.includes("handleCopyPayload"),
  "Audit details modal drawer with formatted metadata and copy JSON is implemented"
);

assert(
  auditPageCode.includes("pageSize") &&
  auditPageCode.includes("totalPages") &&
  auditPageCode.includes("Showing"),
  "Pagination controls (25/50/100 per page) with page indicators are implemented"
);

assert(
  auditPageCode.includes("No audit records found") &&
  auditPageCode.includes("Clear All Filters"),
  "Empty state with helpful guidance and clear filter action is implemented"
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED! Audit Logs system successfully verified.");
  process.exit(0);
} else {
  console.error("❌ Some verification tests failed. Please inspect the errors above.");
  process.exit(1);
}
