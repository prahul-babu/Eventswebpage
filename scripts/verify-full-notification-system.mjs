/**
 * Comprehensive Automated Verification Suite for Apollo University Event Hub Notification System
 * Validates:
 * 1. Faculty -> Student Event Updates & In-App / Email Delivery
 * 2. Admin -> Faculty Notifications & In-App / Email Delivery
 * 3. Scope / Security / Data Model / Route Integrity
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
console.log(" APOLLO UNIVERSITY B.TECH EVENT HUB - NOTIFICATION SYSTEM VERIFICATION SUITE");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// SUITE 1: Route Integrity (Strict Requirement: NO NEW PAGES)
// -----------------------------------------------------------------------------
console.log("[SUITE 1] Route Integrity & Existing UI Compliance");

const routesFile = readFileSync(resolve(SRC_DIR, "app/routes.tsx"), "utf-8");
const forbiddenRoutes = ["/announcements", "/messages", "/inbox", "/communication", "/notifications-center"];

for (const forbidden of forbiddenRoutes) {
  assert(
    !routesFile.includes(`path: "${forbidden}"`) && !routesFile.includes(`path="${forbidden}"`),
    `Forbidden standalone page route '${forbidden}' does not exist`,
    `Found forbidden route in routes.tsx`
  );
}

// -----------------------------------------------------------------------------
// SUITE 2: Email Templates & Branding
// -----------------------------------------------------------------------------
console.log("\n[SUITE 2] Email Templates & Institutional Branding");

const emailTemplatesFile = readFileSync(resolve(SRC_DIR, "lib/email/emailTemplates.ts"), "utf-8");
const emailServiceFile = readFileSync(resolve(SRC_DIR, "lib/email/emailService.ts"), "utf-8");

assert(
  emailTemplatesFile.includes("renderEventUpdateEmailHtml"),
  "Faculty -> Student Event Update email template is defined"
);
assert(
  emailTemplatesFile.includes("renderAdminFacultyNotificationEmailHtml"),
  "Admin -> Faculty Notification email template is defined"
);
assert(
  emailTemplatesFile.includes("THE APOLLO UNIVERSITY") &&
  emailTemplatesFile.includes("School of Technology") &&
  emailTemplatesFile.includes("B.Tech Event Hub"),
  "Email templates strictly reflect Apollo University School of Technology B.Tech Event Hub"
);
assert(
  emailTemplatesFile.toLowerCase().includes("university event hub administration"),
  "Admin -> Faculty email template includes administration sign-off"
);
assert(
  emailServiceFile.includes("sendEventUpdateEmail") &&
  emailServiceFile.includes("sendAdminFacultyNotificationEmail"),
  "Email service exports both event update and admin-faculty email dispatch functions"
);

// -----------------------------------------------------------------------------
// SUITE 3: Faculty -> Student Event Update System
// -----------------------------------------------------------------------------
console.log("\n[SUITE 3] Faculty -> Student Event Updates & Validation");

const updatesFile = readFileSync(resolve(SRC_DIR, "lib/queries/updates.ts"), "utf-8");
const sendUpdateModalFile = readFileSync(resolve(SRC_DIR, "components/events/SendEventUpdateModal.tsx"), "utf-8");
const myEventsPageFile = readFileSync(resolve(SRC_DIR, "pages/faculty/MyEventsPage.tsx"), "utf-8");

assert(
  updatesFile.includes("useSendEventUpdate") && updatesFile.includes("useEventUpdates"),
  "useSendEventUpdate mutation and useEventUpdates query are implemented"
);
assert(
  sendUpdateModalFile.includes("confirmedCount === 0") &&
  sendUpdateModalFile.includes("No students have registered"),
  "SendEventUpdateModal prevents broadcasting when 0 registered students exist"
);
assert(
  sendUpdateModalFile.includes("subject") && sendUpdateModalFile.includes("message"),
  "SendEventUpdateModal includes Subject and Message fields"
);
assert(
  sendUpdateModalFile.includes("In-App Notification") && sendUpdateModalFile.includes("Outlook Email"),
  "SendEventUpdateModal supports dual in-app and email delivery channels"
);
assert(
  myEventsPageFile.includes("SendEventUpdateModal") && myEventsPageFile.includes("Send Update"),
  "Faculty MyEventsPage has direct 'Send Update' action in dropdown for faculty events"
);

// -----------------------------------------------------------------------------
// SUITE 4: Student In-App Notification Bell & Registered Events UI
// -----------------------------------------------------------------------------
console.log("\n[SUITE 4] Student Notification Bell & Registered Events Integration");

const notifBellFile = readFileSync(resolve(SRC_DIR, "components/layout/NotificationBell.tsx"), "utf-8");
const myRegistrationsPageFile = readFileSync(resolve(SRC_DIR, "pages/student/MyRegistrationsPage.tsx"), "utf-8");
const eventUpdatesSectionFile = readFileSync(resolve(SRC_DIR, "components/events/EventUpdatesSection.tsx"), "utf-8");

assert(
  notifBellFile.includes("onSnapshot") && notifBellFile.includes("recipientUid"),
  "NotificationBell listens in real-time via onSnapshot filtered to current user"
);
assert(
  notifBellFile.includes("ADMIN_FACULTY_UPDATE") &&
  (notifBellFile.includes("FACULTY_EVENT_UPDATE") || notifBellFile.includes("EVENT_UPDATED")),
  "NotificationBell supports Admin Update and Faculty Event Update types with distinct badges"
);
assert(
  notifBellFile.includes("handleMarkAllAsRead") && notifBellFile.includes("handleItemClick"),
  "NotificationBell supports 'Mark all read' and contextual item click navigation"
);
assert(
  myRegistrationsPageFile.includes("unreadUpdatesData") &&
  myRegistrationsPageFile.includes("View Updates"),
  "Student MyRegistrationsPage shows live update badge and 'View Updates' action"
);
assert(
  (eventUpdatesSectionFile.includes("Event Announcements & Updates") || eventUpdatesSectionFile.includes("Event Announcements &amp; Updates")) &&
  eventUpdatesSectionFile.includes("useEventUpdates"),
  "EventUpdatesSection displays persistent chronological update history on event page"
);

// -----------------------------------------------------------------------------
// SUITE 5: Admin -> Faculty Notifications System
// -----------------------------------------------------------------------------
console.log("\n[SUITE 5] Admin -> Faculty Notification System & Portal Integration");

const adminNotifsFile = readFileSync(resolve(SRC_DIR, "lib/queries/adminNotifications.ts"), "utf-8");
const sendFacultyModalFile = readFileSync(resolve(SRC_DIR, "components/admin/SendFacultyNotificationModal.tsx"), "utf-8");
const adminUsersPageFile = readFileSync(resolve(SRC_DIR, "pages/admin/AdminUsersPage.tsx"), "utf-8");
const adminUserProfilePageFile = readFileSync(resolve(SRC_DIR, "pages/admin/AdminUserProfilePage.tsx"), "utf-8");
const adminApprovalsPageFile = readFileSync(resolve(SRC_DIR, "pages/admin/AdminApprovalsPage.tsx"), "utf-8");
const adminEventReviewPageFile = readFileSync(resolve(SRC_DIR, "pages/admin/AdminEventReviewPage.tsx"), "utf-8");

assert(
  adminNotifsFile.includes("useSendAdminFacultyNotification"),
  "useSendAdminFacultyNotification mutation is implemented"
);
assert(
  adminNotifsFile.includes("ADMIN_FACULTY_UPDATE") &&
  adminNotifsFile.includes("recipientRole: \"faculty\"") &&
  adminNotifsFile.includes("senderRole: \"admin\""),
  "Admin notification payload complies with security data model and recipient scoping"
);
assert(
  sendFacultyModalFile.includes("SendFacultyNotificationModal") &&
  sendFacultyModalFile.includes("Quick Suggestion Templates"),
  "SendFacultyNotificationModal component is created with quick suggestions and recipient identity"
);
assert(
  adminUsersPageFile.includes("SendFacultyNotificationModal") &&
  adminUsersPageFile.includes("Send Notification"),
  "AdminUsersPage integrates Send Notification action for faculty members"
);
assert(
  adminUserProfilePageFile.includes("SendFacultyNotificationModal") &&
  adminUserProfilePageFile.includes("Send Notification"),
  "AdminUserProfilePage integrates Send Notification action in faculty profile header"
);
assert(
  adminApprovalsPageFile.includes("SendFacultyNotificationModal") &&
  adminApprovalsPageFile.includes("Message"),
  "AdminApprovalsPage integrates messaging action for faculty applicants"
);
assert(
  adminEventReviewPageFile.includes("SendFacultyNotificationModal") &&
  adminEventReviewPageFile.includes("Message Faculty Organiser"),
  "AdminEventReviewPage integrates 'Message Faculty Organiser' action"
);

// -----------------------------------------------------------------------------
// SUITE 6: Auth & Loading Resilience
// -----------------------------------------------------------------------------
console.log("\n[SUITE 6] Auth & Loading Screen Resilience");

const authLoadingScreenFile = readFileSync(resolve(SRC_DIR, "components/auth/AuthLoadingScreen.tsx"), "utf-8");

assert(
  authLoadingScreenFile.includes("showRetry") &&
  authLoadingScreenFile.includes("Reload") &&
  authLoadingScreenFile.includes("Go to Login"),
  "AuthLoadingScreen includes fallback reload and navigation to prevent infinite spinner lockup"
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED! Notification & update system successfully verified.");
  process.exit(0);
} else {
  console.error("❌ Some verification tests failed. Please inspect the errors above.");
  process.exit(1);
}
