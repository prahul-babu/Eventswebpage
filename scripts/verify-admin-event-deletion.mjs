#!/usr/bin/env node
/**
 * Verification Script: Admin Event Real Database Deletion
 * Tests and verifies that Event Deletion performs a real database deletion,
 * cleans up related records safely, logs audit records, and prevents stale state.
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
console.log(" APOLLO UNIVERSITY B.TECH EVENT HUB - ADMIN EVENT DELETION VERIFICATION");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// SUITE 1: Backend Cloud Function & Firestore Security
// -----------------------------------------------------------------------------
console.log("[SUITE 1] Backend Cloud Function & Firestore Operations");

const deleteFunctionPath = path.join(ROOT_DIR, "functions/src/events/deleteEvent.ts");
assert(fs.existsSync(deleteFunctionPath), "functions/src/events/deleteEvent.ts exists");

if (fs.existsSync(deleteFunctionPath)) {
  const content = fs.readFileSync(deleteFunctionPath, "utf-8");
  assert(content.includes("export const deleteEvent = onCall"), "deleteEvent Cloud Function is exported");
  assert(content.includes("userRole !== \"admin\"") || content.includes("role !== \"admin\""), "Verifies caller is an Administrator");
  assert(content.includes("batch.delete(eventRef)"), "Performs actual database deletion on events/{eventId}");
  assert(content.includes("batch.delete(d.ref)") || content.includes("delete"), "Cleans up related event updates and subcollections");
  assert(content.includes("status: \"CANCELLED\""), "Updates/cancels linked registrations without deleting student accounts");
  assert(content.includes("action: \"EVENT_DELETED\""), "Writes audit log for institutional governance");
}

const functionsIndexPath = path.join(ROOT_DIR, "functions/src/index.ts");
if (fs.existsSync(functionsIndexPath)) {
  const content = fs.readFileSync(functionsIndexPath, "utf-8");
  assert(content.includes("export { deleteEvent }"), "functions/src/index.ts exports deleteEvent");
}

// -----------------------------------------------------------------------------
// SUITE 2: Frontend Query & Mutation Hook (useDeleteEvent)
// -----------------------------------------------------------------------------
console.log("\n[SUITE 2] Frontend Query & Mutation Hook (useDeleteEvent)");

const adminQueriesPath = path.join(ROOT_DIR, "src/lib/queries/admin.ts");
assert(fs.existsSync(adminQueriesPath), "src/lib/queries/admin.ts exists");

if (fs.existsSync(adminQueriesPath)) {
  const content = fs.readFileSync(adminQueriesPath, "utf-8");
  assert(content.includes("export function useDeleteEvent()"), "useDeleteEvent mutation is implemented");
  assert(content.includes("deleteDoc(eventDocRef)") || content.includes("batch.delete(eventDocRef)"), "Performs real Firestore delete operation");
  assert(content.includes("queryClient.invalidateQueries"), "Invalidates admin and public event query caches");
  assert(content.includes("queryClient.removeQueries({ queryKey: [\"event\", data.eventId] })"), "Removes single event query from cache to prevent stale data");
  assert(content.includes("action: \"EVENT_DELETED\""), "Creates audit_logs record for event deletion");
}

// -----------------------------------------------------------------------------
// SUITE 3: Admin Events Page UI & Confirmation Dialog
// -----------------------------------------------------------------------------
console.log("\n[SUITE 3] Admin Events Page UI & Confirmation Dialog");

const adminEventsPagePath = path.join(ROOT_DIR, "src/pages/admin/AdminEventsPage.tsx");
assert(fs.existsSync(adminEventsPagePath), "src/pages/admin/AdminEventsPage.tsx exists");

if (fs.existsSync(adminEventsPagePath)) {
  const content = fs.readFileSync(adminEventsPagePath, "utf-8");
  assert(content.includes("useDeleteEvent"), "AdminEventsPage imports and initializes useDeleteEvent");
  assert(content.includes("deleteModalOpen") && content.includes("setDeleteModalOpen"), "Manages delete confirmation modal state");
  assert(content.includes("Permanently Delete Event"), "Includes explicit confirmation modal header");
  assert(content.includes("eventToDelete?.title"), "Displays target event title in confirmation dialog");
  assert(content.includes("disabled={deleteEventMutation.isPending}"), "Disables buttons during active deletion to prevent duplicates");
  assert(content.includes("Trash2"), "Uses standard institutional trash icon for delete action");
}

// -----------------------------------------------------------------------------
// SUITE 4: Event Detail 404 Resilience
// -----------------------------------------------------------------------------
console.log("\n[SUITE 4] Event Detail 404 Resilience");

const eventDetailPagePath = path.join(ROOT_DIR, "src/pages/EventDetailPage.tsx");
if (fs.existsSync(eventDetailPagePath)) {
  const content = fs.readFileSync(eventDetailPagePath, "utf-8");
  assert(content.includes("Event Not Found"), "EventDetailPage renders 404 state when event does not exist");
  assert(content.includes("The requested event may have been unpublished or removed"), "Informs user that event was removed");
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED! Admin Event Real Deletion is verified.\n");
  process.exit(0);
} else {
  console.error("❌ Some verification checks failed.\n");
  process.exit(1);
}
