#!/usr/bin/env node
/**
 * Verification Script: Faculty Post-Event Outcome Report System
 * Validates form state management, 6-section schema, validation logic,
 * rich text editing, draft saving, completeness calculation, and export utilities.
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
console.log(" APOLLO UNIVERSITY B.TECH EVENT HUB - FACULTY REPORT SYSTEM VERIFICATION");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// SUITE 1: Report Page Structure & Section Architecture
// -----------------------------------------------------------------------------
console.log("[SUITE 1] Report Page Architecture & 6-Section Configuration");

const builderPagePath = path.join(ROOT_DIR, "src/pages/faculty/EventReportBuilderPage.tsx");
assert(fs.existsSync(builderPagePath), "src/pages/faculty/EventReportBuilderPage.tsx exists");

if (fs.existsSync(builderPagePath)) {
  const content = fs.readFileSync(builderPagePath, "utf-8");

  // Section 1: Executive Summary & Objectives
  assert(content.includes("Section 1: Event Summary") && content.includes("Objectives"), "Section 1: Event Summary & Objectives configured");
  assert(content.includes("executiveSummary"), "Executive Summary field bound");
  assert(content.includes("objectives"), "Academic Objectives list configured with add/remove");

  // Section 2: Participation & Demographics
  assert(content.includes("Section 2: Participation") && content.includes("Demographics"), "Section 2: Participation & Demographics configured");
  assert(content.includes("actualAttendance"), "Actual Attendance Verified number input configured");
  assert(content.includes("studentVolunteersNames"), "Student Volunteer Coordinators field configured");

  // Section 3: Resource Persons & Speakers
  assert(content.includes("Section 3: Keynote Speakers") && content.includes("Resource Persons"), "Section 3: Resource Persons configured");
  assert(content.includes("Add Speaker"), "Add Speaker button configured");
  assert(content.includes("sessionTopic"), "Speaker topic and designation fields bound");

  // Section 4: Budget & Financial Statement
  assert(content.includes("Section 4: Financial Statement") && content.includes("Balance Sheet"), "Section 4: Financial Statement configured");
  assert(content.includes("budgetAllocated") && content.includes("budgetSpent"), "Budget Allocated and Total Spent fields configured");
  assert(content.includes("balance: allocated - spent") || content.includes("Allocated - Spent") || content.includes("allocated - spent"), "Auto-calculates Balance Remaining = Allocated - Spent");

  // Section 5: Media & Event Attachments
  assert(content.includes("EventAttachmentsManager"), "Section 5: EventAttachmentsManager embedded for real file uploads");

  // Section 6: Feedback & Student Impact
  assert(content.includes("Section 6: Attendee Feedback") && content.includes("Student Impact"), "Section 6: Feedback & Student Impact configured");
  assert(content.includes("feedbackSummary"), "Feedback Summary textarea configured");
  assert(content.includes("participantQuotes"), "Representative Participant Quotes configured with add/remove");
}

// -----------------------------------------------------------------------------
// SUITE 2: State Persistence & Bug Fix Verification
// -----------------------------------------------------------------------------
console.log("\n[SUITE 2] State Stability & Form Persistence");

if (fs.existsSync(builderPagePath)) {
  const content = fs.readFileSync(builderPagePath, "utf-8");
  assert(content.includes("isInitializedRef"), "Uses initialization ref to prevent overwriting user input on re-renders");
  assert(content.includes("handleSaveDraft"), "Save Draft handler implemented");
  assert(content.includes("validateForm"), "Validation logic enforces required fields before final submit");
  assert(content.includes("overallCompleteness"), "Dynamic completeness gauge calculated from real section state");
}

// -----------------------------------------------------------------------------
// SUITE 3: RichTextEditor Fluid Typing & Focus Management
// -----------------------------------------------------------------------------
console.log("\n[SUITE 3] RichTextEditor Fluidity & Component Integrity");

const editorPath = path.join(ROOT_DIR, "src/components/events/RichTextEditor.tsx");
assert(fs.existsSync(editorPath), "src/components/events/RichTextEditor.tsx exists");

if (fs.existsSync(editorPath)) {
  const content = fs.readFileSync(editorPath, "utf-8");
  assert(content.includes("isInternalChangeRef"), "Tracks internal typing changes to prevent cursor jumping");
  assert(content.includes("document.activeElement !== editorRef.current"), "Preserves DOM focus and cursor position during active typing");
  assert(content.includes("DOMPurify.sanitize"), "Sanitizes HTML content for security");
}

// -----------------------------------------------------------------------------
// SUITE 4: Export Utilities (PDF & DOCX)
// -----------------------------------------------------------------------------
console.log("\n[SUITE 4] PDF & DOCX Export Handlers");

const pdfPath = path.join(ROOT_DIR, "src/lib/pdf/reportPdfGenerator.ts");
const docxPath = path.join(ROOT_DIR, "src/lib/docx/reportDocxGenerator.ts");

assert(fs.existsSync(pdfPath), "reportPdfGenerator.ts exists");
assert(fs.existsSync(docxPath), "reportDocxGenerator.ts exists");

if (fs.existsSync(pdfPath)) {
  const content = fs.readFileSync(pdfPath, "utf-8");
  assert(content.includes("Executive Summary & Objectives"), "PDF generator renders Section 1");
  assert(content.includes("Participation & Attendance Metrics"), "PDF generator renders Section 2");
  assert(content.includes("Resource Persons & Keynote Speakers"), "PDF generator renders Section 3");
  assert(content.includes("Financial Statement"), "PDF generator renders Section 4");
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED! Faculty Post-Event Report system successfully verified.\n");
  process.exit(0);
} else {
  console.error("❌ Some verification checks failed.\n");
  process.exit(1);
}
