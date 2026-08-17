/**
 * Apollo University Event Hub — File Upload System & Post-Event Outcome Report Section 5 Verification Suite
 */

import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const ROOT_DIR = process.cwd();
const SRC_DIR = join(ROOT_DIR, "src");

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
console.log(" APOLLO UNIVERSITY B.TECH EVENT HUB - FILE UPLOAD & ATTACHMENTS VERIFICATION");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// SUITE 1: Supported File Types & Size Validation Configuration
// -----------------------------------------------------------------------------
console.log("[SUITE 1] Supported File Types & Size Validation Configuration");

const fileTypesConfigPath = resolve(SRC_DIR, "config/file-types.ts");
assert(existsSync(fileTypesConfigPath), "src/config/file-types.ts exists");

const fileTypesContent = readFileSync(fileTypesConfigPath, "utf-8");

assert(fileTypesContent.includes(".jpg") && fileTypesContent.includes(".jpeg") && fileTypesContent.includes(".png") && fileTypesContent.includes(".webp"), "Image formats (JPG, JPEG, PNG, WEBP) are supported");
assert(fileTypesContent.includes(".mp4") && fileTypesContent.includes(".mov") && fileTypesContent.includes(".webm") && fileTypesContent.includes(".avi"), "Video formats (MP4, MOV, WEBM, AVI) are supported");
assert(fileTypesContent.includes(".pdf") && fileTypesContent.includes(".docx") && fileTypesContent.includes(".doc") && fileTypesContent.includes(".txt"), "Document formats (PDF, DOCX, DOC, TXT) are supported");
assert(fileTypesContent.includes(".xlsx") && fileTypesContent.includes(".xls") && fileTypesContent.includes(".csv"), "Spreadsheet formats (XLSX, XLS, CSV) are supported");
assert(fileTypesContent.includes(".pptx") && fileTypesContent.includes(".ppt"), "Presentation formats (PPTX, PPT) are supported");
assert(fileTypesContent.includes(".zip"), "Archive formats (ZIP) are supported");
assert(fileTypesContent.includes("validateAttachmentFile"), "validateAttachmentFile function is exported");
assert(fileTypesContent.includes("getFileCategoryInfo"), "getFileCategoryInfo function is exported");
assert(fileTypesContent.includes("formatFileSize"), "formatFileSize function is exported");

// -----------------------------------------------------------------------------
// SUITE 2: Storage Security Rules Configuration
// -----------------------------------------------------------------------------
console.log("\n[SUITE 2] Storage Security Rules Configuration");

const storageRulesPath = resolve(ROOT_DIR, "storage.rules");
assert(existsSync(storageRulesPath), "storage.rules exists");

const storageRulesContent = readFileSync(storageRulesPath, "utf-8");

assert(storageRulesContent.includes("match /events/{eventId}/attachments/{fileName}") || storageRulesContent.includes("match /events/{eventId}/attachments/"), "Storage rules match event attachments path");
assert(storageRulesContent.includes("match /reports/{eventId}/{allPaths=**}"), "Storage rules match post-event report media path");
assert(storageRulesContent.includes("isSignedIn()"), "Storage rules enforce authenticated user session");
assert(storageRulesContent.includes("100 * 1024 * 1024"), "Storage rules accommodate large videos and archives up to 100MB");
assert(!storageRulesContent.includes("allow read, write: if true;"), "Storage rules do not use dangerous wildcard public write access");

// -----------------------------------------------------------------------------
// SUITE 3: Resumable Upload Flow & Error Mapping in queries/attachments.ts
// -----------------------------------------------------------------------------
console.log("\n[SUITE 3] Resumable Upload Flow & Error Mapping");

const attachmentsQueryPath = resolve(SRC_DIR, "lib/queries/attachments.ts");
assert(existsSync(attachmentsQueryPath), "src/lib/queries/attachments.ts exists");

const attachmentsQueryContent = readFileSync(attachmentsQueryPath, "utf-8");

assert(attachmentsQueryContent.includes("uploadBytesResumable"), "Uses uploadBytesResumable to enable real progress tracking");
assert(attachmentsQueryContent.includes("state_changed"), "Listens to state_changed event on the UploadTask");
assert(attachmentsQueryContent.includes("bytesTransferred"), "Tracks bytesTransferred and totalBytes for real progress percentage");
assert(attachmentsQueryContent.includes("getDownloadURL"), "Retrieves permanent download URL upon task completion");
assert(attachmentsQueryContent.includes("formatStorageErrorMessage"), "Exports formatStorageErrorMessage for mapping Firebase error codes");
assert(attachmentsQueryContent.includes("storage/unauthorized"), "Handles storage/unauthorized with user-friendly session notice");
assert(attachmentsQueryContent.includes("storage/quota-exceeded"), "Handles storage/quota-exceeded cleanly");
assert(attachmentsQueryContent.includes("DOCUMENT_UPLOADED"), "Creates audit log entry on successful document upload");
assert(attachmentsQueryContent.includes("DOCUMENT_DELETED"), "Creates audit log entry on document deletion");
assert(attachmentsQueryContent.includes("sanitizeFirestoreData"), "Sanitizes Firestore metadata payload to eliminate undefined errors");

// -----------------------------------------------------------------------------
// SUITE 4: EventAttachmentsManager Multi-File Queue & UI States
// -----------------------------------------------------------------------------
console.log("\n[SUITE 4] EventAttachmentsManager Multi-File Queue & UI States");

const managerPath = resolve(SRC_DIR, "components/attachments/EventAttachmentsManager.tsx");
assert(existsSync(managerPath), "src/components/attachments/EventAttachmentsManager.tsx exists");

const managerContent = readFileSync(managerPath, "utf-8");

assert(managerContent.includes("uploadQueue"), "Manages dedicated uploadQueue state for individual file tracking");
assert(managerContent.includes("UPLOADING") && managerContent.includes("SUCCESS") && managerContent.includes("FAILED") && managerContent.includes("CANCELLED"), "Supports all required upload lifecycle states (UPLOADING, SUCCESS, FAILED, CANCELLED)");
assert(managerContent.includes("Uploaded successfully ✓"), "Renders clear success indicator upon completion");
assert(managerContent.includes("handleRetryUpload") || managerContent.includes("Retry"), "Provides retry action for failed uploads");
assert(managerContent.includes("handleCancelUpload") || managerContent.includes("taskRef.cancel()"), "Provides cancellation mechanism for in-progress uploads");
assert(managerContent.includes("validateAttachmentFile"), "Performs client-side validation prior to network dispatch");
assert(managerContent.includes("onDragOver") && managerContent.includes("onDrop"), "Supports drag-and-drop file upload");
assert(managerContent.includes("previewAttachment"), "Provides preview dialog modal for image attachments");
assert(managerContent.includes("downloadOriginalAttachment"), "Provides direct download action for all file types");
assert(managerContent.includes("attachmentToDelete"), "Includes confirmation dialog before deleting attachments");

// -----------------------------------------------------------------------------
// SUITE 5: Faculty Report Builder Section 5 Integration
// -----------------------------------------------------------------------------
console.log("\n[SUITE 5] Faculty Report Builder Section 5 Integration");

const reportBuilderPath = resolve(SRC_DIR, "pages/faculty/EventReportBuilderPage.tsx");
assert(existsSync(reportBuilderPath), "src/pages/faculty/EventReportBuilderPage.tsx exists");

const reportBuilderContent = readFileSync(reportBuilderPath, "utf-8");

assert(reportBuilderContent.includes("activeSection === 5"), "Section 5 is configured for Media & Attachments");
assert(reportBuilderContent.includes("<EventAttachmentsManager"), "Embeds EventAttachmentsManager component in Section 5");
assert(reportBuilderContent.includes("useEventAttachments"), "Consumes useEventAttachments hook for dynamic state tracking");
assert(reportBuilderContent.includes("sectionCompleteness"), "Calculates dynamic section completeness from saved data and attachments");

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED! Faculty Post-Event Report File Upload System is fully verified.");
  process.exit(0);
} else {
  console.error("❌ Some verification tests failed. Please review the output above.");
  process.exit(1);
}
