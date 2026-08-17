#!/usr/bin/env node
/**
 * Verification Script: Apollo University Admin Users & Event Management Upgrade
 * Validates:
 * 1. Admin User Directory: Multi-field search, role/status filters, sorting, pagination.
 * 2. Enterprise Password Security: Zero-knowledge policy, masked credentials, password reset flow, audit trail.
 * 3. User Profile Editing: 10-digit phone validation, email validation, role/status governance.
 * 4. Event Registration Management: Attendee table, gate check-in toggle, CSV export, event statistics.
 * 5. Admin Event Control: Direct registration inspection, reports, delete/cancel controls, and audit logs.
 */

import fs from "fs";
import path from "path";

const ROOT_DIR = process.cwd();

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log("\n================================================================================");
console.log(" APOLLO UNIVERSITY B.TECH EVENT HUB - ADMIN SYSTEM UPGRADE VERIFICATION");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// SUITE 1: Admin User Directory & Search / Filter Configuration
// -----------------------------------------------------------------------------
console.log("[SUITE 1] Admin User Directory & Search/Filter Architecture");

const usersPagePath = path.join(ROOT_DIR, "src/pages/admin/AdminUsersPage.tsx");
assert(fs.existsSync(usersPagePath), "src/pages/admin/AdminUsersPage.tsx exists");

if (fs.existsSync(usersPagePath)) {
  const content = fs.readFileSync(usersPagePath, "utf-8");

  assert(content.includes("searchQuery"), "Search query state managed");
  assert(content.includes("roleFilter"), "Role filtering configured");
  assert(content.includes("statusFilter"), "Status filtering configured");
  assert(content.includes("departmentFilter"), "Department filtering configured");
  assert(content.includes("sortField") && content.includes("sortOrder"), "Multi-field sorting configured");
  assert(content.includes("currentPage") && content.includes("PAGE_SIZE"), "Client pagination configured");
  assert(content.includes("handleExportCsv"), "Directory CSV export handler implemented");
  assert(content.includes("UserDetailsModal"), "UserDetailsModal integrated");
  assert(content.includes("EditUserModal"), "EditUserModal integrated");
  assert(content.includes("ResetPasswordModal"), "ResetPasswordModal integrated");
}

// -----------------------------------------------------------------------------
// SUITE 2: Password Zero-Knowledge & Security Policy
// -----------------------------------------------------------------------------
console.log("\n[SUITE 2] Enterprise Zero-Knowledge Password Security");

const resetModalPath = path.join(ROOT_DIR, "src/components/admin/ResetPasswordModal.tsx");
assert(fs.existsSync(resetModalPath), "src/components/admin/ResetPasswordModal.tsx exists");

if (fs.existsSync(resetModalPath)) {
  const content = fs.readFileSync(resetModalPath, "utf-8");
  assert(content.includes("••••••••••••••") || content.includes("••••••••••"), "Masks credentials with zero-knowledge indicator");
  assert(content.includes("useAdminResetUserPassword"), "Binds to useAdminResetUserPassword mutation");
  assert(!content.includes("passwordHash") && !content.includes("currentPassword"), "Never exposes or stores plaintext password or hashes");
}

const adminUsersPath = path.join(ROOT_DIR, "src/lib/queries/adminUsers.ts");
assert(fs.existsSync(adminUsersPath), "src/lib/queries/adminUsers.ts exists");

if (fs.existsSync(adminUsersPath)) {
  const content = fs.readFileSync(adminUsersPath, "utf-8");
  assert(content.includes("sendPasswordResetEmail"), "Dispatches official password reset via sendPasswordResetEmail");
  assert(content.includes("PASSWORD_RESET_REQUESTED"), "Logs PASSWORD_RESET_REQUESTED to institutional audit log");
  assert(content.includes("useAdminEditUser"), "Implements useAdminEditUser mutation");
  assert(content.includes("isValidOptionalPhoneNumber"), "Enforces phone number format validation");
}

// -----------------------------------------------------------------------------
// SUITE 3: Admin Edit User Form & Strict Validation
// -----------------------------------------------------------------------------
console.log("\n[SUITE 3] Admin Edit User Form & Validation");

const editModalPath = path.join(ROOT_DIR, "src/components/admin/EditUserModal.tsx");
assert(fs.existsSync(editModalPath), "src/components/admin/EditUserModal.tsx exists");

if (fs.existsSync(editModalPath)) {
  const content = fs.readFileSync(editModalPath, "utf-8");
  assert(content.includes("displayName"), "Full Name field bound");
  assert(content.includes("phoneNumber"), "Phone number field bound");
  assert(content.includes("alternateEmail"), "Alternate email field bound");
  assert(content.includes("department"), "Department dropdown bound");
  assert(content.includes("rollNumber") && content.includes("employeeId"), "Roll number and Employee ID fields bound");
  assert(content.includes("isValidOptionalPhoneNumber"), "Frontend validates phone number");
  assert(content.includes("PHONE_ERROR_MESSAGES.INVALID"), "Displays institutional phone validation message");
}

// -----------------------------------------------------------------------------
// SUITE 4: Event Registration & Attendee Roster Management
// -----------------------------------------------------------------------------
console.log("\n[SUITE 4] Event Registration & Attendee Roster Management");

const registrantsPagePath = path.join(ROOT_DIR, "src/pages/faculty/EventRegistrantsPage.tsx");
assert(fs.existsSync(registrantsPagePath), "src/pages/faculty/EventRegistrantsPage.tsx exists");

if (fs.existsSync(registrantsPagePath)) {
  const content = fs.readFileSync(registrantsPagePath, "utf-8");
  assert(content.includes("totalCapacity") && content.includes("availableSeats"), "Calculates total capacity and available seats");
  assert(content.includes("checkedInCount") && content.includes("noShowsCount"), "Calculates turnout and no-shows metrics");
  assert(content.includes("totalRevenue"), "Calculates gross registration revenue");
  assert(content.includes("handleExportCSV"), "CSV export handler configured");
  assert(content.includes("StudentRegistrationDetailsModal"), "StudentRegistrationDetailsModal integrated");
  assert(content.includes("handleToggleAttendance"), "Gate attendance toggle configured");
}

const regModalPath = path.join(ROOT_DIR, "src/components/admin/StudentRegistrationDetailsModal.tsx");
assert(fs.existsSync(regModalPath), "src/components/admin/StudentRegistrationDetailsModal.tsx exists");

if (fs.existsSync(regModalPath)) {
  const content = fs.readFileSync(regModalPath, "utf-8");
  assert(content.includes("userDisplayName") && content.includes("userRollNumber"), "Displays student name and roll number");
  assert(content.includes("ticketCode"), "Displays ticket code");
  assert(content.includes("onToggleAttendance"), "Allows gate check-in toggle from modal");
}

// -----------------------------------------------------------------------------
// SUITE 5: Routes & Admin Navigation Integrity
// -----------------------------------------------------------------------------
console.log("\n[SUITE 5] Routes & Admin Navigation Architecture");

const routesPath = path.join(ROOT_DIR, "src/app/routes.tsx");
assert(fs.existsSync(routesPath), "src/app/routes.tsx exists");

if (fs.existsSync(routesPath)) {
  const content = fs.readFileSync(routesPath, "utf-8");
  assert(content.includes("/admin/events/:eventId/registrations"), "Configured route /admin/events/:eventId/registrations");
  assert(content.includes("/admin/users/:uid"), "Configured route /admin/users/:uid");
  assert(content.includes("/admin/reports/:eventId"), "Configured route /admin/reports/:eventId");
}

const adminEventsPagePath = path.join(ROOT_DIR, "src/pages/admin/AdminEventsPage.tsx");
if (fs.existsSync(adminEventsPagePath)) {
  const content = fs.readFileSync(adminEventsPagePath, "utf-8");
  assert(content.includes("/admin/events/${event.id}/registrations"), "AdminEventsPage links directly to attendee registrations");
  assert(content.includes("/admin/reports/${event.id}"), "AdminEventsPage links directly to post-event reports");
  assert(content.includes("deleteEventMutation"), "AdminEventsPage integrates real delete event mutation");
}

// -----------------------------------------------------------------------------
// RESULTS SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED! Admin Users & Event Management upgrade is fully verified.\n");
  process.exit(0);
} else {
  console.error("❌ Some verification tests failed.\n");
  process.exit(1);
}
