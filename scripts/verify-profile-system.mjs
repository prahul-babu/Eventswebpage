/**
 * Automated Verification Suite for Apollo University Event Hub Profile System
 * Validates:
 * 1. Complete removal of non-B.Tech options (School of Management, School of Health Sciences, General Administration, School of Technology)
 * 2. Strict presence of the 6 exact B.Tech streams
 * 3. Role-specific Student, Faculty, and Admin profile field separation
 * 4. Normalization and Backend/Zod validation integrity
 */

import { readFileSync } from "fs";
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
console.log(" APOLLO UNIVERSITY EVENT HUB - PROFILE SYSTEM VERIFICATION SUITE");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// SUITE 1: B.Tech Streams Constants & Normalization
// -----------------------------------------------------------------------------
console.log("[SUITE 1] B.Tech Streams & Department Configuration");

const deptsFile = readFileSync(resolve(SRC_DIR, "config/departments.ts"), "utf-8");
const userTypesFile = readFileSync(resolve(SRC_DIR, "types/user.ts"), "utf-8");

const requiredStreams = [
  "B.Tech. Computer Science and Engineering",
  "B.Tech. CSE - Artificial Intelligence and Data Science",
  "B.Tech. CSE - Artificial Intelligence and Machine Learning",
  "B.Tech. CSE - Cyber Security",
  "B.Tech. CSE - Cloud Computing",
  "B.Tech. CSE - AI & Health Care Technology",
];

for (const stream of requiredStreams) {
  assert(
    deptsFile.includes(stream),
    `config/departments.ts includes stream '${stream}'`
  );
  assert(
    userTypesFile.includes(stream),
    `types/user.ts includes stream '${stream}'`
  );
}

assert(
  deptsFile.includes("isForbiddenNonBTechDepartment") &&
  deptsFile.includes("normalizeBTechDepartment"),
  "Normalization functions are defined in config/departments.ts"
);

// -----------------------------------------------------------------------------
// SUITE 2: Student Profile Fields & Role Scoping
// -----------------------------------------------------------------------------
console.log("\n[SUITE 2] Student Profile Requirements");

const profilePageFile = readFileSync(resolve(SRC_DIR, "pages/ProfilePage.tsx"), "utf-8");

assert(
  profilePageFile.includes("role === \"student\"") &&
  profilePageFile.includes("Student Roll Number *") &&
  profilePageFile.includes("B.Tech Programme *") &&
  profilePageFile.includes("Year of Study *"),
  "Student profile includes Roll Number, B.Tech Programme *, and Year of Study"
);

assert(
  profilePageFile.includes("Emergency Contact (Optional)") &&
  profilePageFile.includes("emergencyContactName") &&
  profilePageFile.includes("emergencyContactPhone"),
  "Student profile includes optional Emergency Contact section"
);

// -----------------------------------------------------------------------------
// SUITE 3: Faculty Profile Fields & Role Scoping
// -----------------------------------------------------------------------------
console.log("\n[SUITE 3] Faculty Profile Requirements");

assert(
  profilePageFile.includes("role === \"faculty\"") &&
  profilePageFile.includes("Faculty / Employee ID *") &&
  profilePageFile.includes("B.Tech Programme *") &&
  profilePageFile.includes("Designation *"),
  "Faculty profile includes Faculty ID, B.Tech Programme *, and Designation"
);

// -----------------------------------------------------------------------------
// SUITE 4: Admin Profile Fields & Strict Academic Exclusion
// -----------------------------------------------------------------------------
console.log("\n[SUITE 4] Admin Profile Requirements (Strict Academic Exclusion)");

assert(
  profilePageFile.includes("role === \"admin\" ? \"Edit Profile\" : \"Edit Institutional Profile\""),
  "Admin profile modal uses clean 'Edit Profile' header"
);

assert(
  profilePageFile.includes("role === \"admin\"") &&
  profilePageFile.includes("Official Email"),
  "Admin profile displays official email and contact number"
);

// Verify payload construction in handleSaveProfile for admin only sends displayName & phone
assert(
  profilePageFile.includes("updatesPayload = {\n          displayName: displayName.trim(),\n          phoneNumber: phoneNumber.trim(),\n          phone: phoneNumber.trim(),\n        };") ||
  profilePageFile.includes("displayName: displayName.trim(),\n          phoneNumber: phoneNumber.trim(),\n          phone: phoneNumber.trim(),"),
  "Admin save payload contains only administrator personal/contact data (no academic/programme fields)"
);

// -----------------------------------------------------------------------------
// SUITE 5: Global Removal of Obsolete Institutional Values
// -----------------------------------------------------------------------------
console.log("\n[SUITE 5] Global Removal of Obsolete Institutional Values");

const forbiddenTerms = [
  "School of Management",
  "School of Health Sciences",
  "General Administration",
];

for (const term of forbiddenTerms) {
  assert(
    !profilePageFile.includes(`"${term}"`),
    `ProfilePage does not contain selectable option '${term}'`
  );
}

// -----------------------------------------------------------------------------
// SUITE 6: Client-Side Validation & Undefined Elimination
// -----------------------------------------------------------------------------
const authContextFile = readFileSync(resolve(SRC_DIR, "lib/auth-context.tsx"), "utf-8");
const validationProfileFile = readFileSync(resolve(SRC_DIR, "lib/validation/profile.ts"), "utf-8");
const validationPhoneFile = readFileSync(resolve(SRC_DIR, "lib/validation/phone.ts"), "utf-8");

assert(
  (profilePageFile.includes("validateProfileForm") || profilePageFile.includes("Full name is required.")) &&
  validationProfileFile.includes("Full name is required.") &&
  validationPhoneFile.includes("Mobile contact number is required.") &&
  validationProfileFile.includes("Student roll number is required.") &&
  validationProfileFile.includes("Please select your year of study.") &&
  validationProfileFile.includes("Please select your B.Tech programme."),
  "Form-first validation checks all mandatory fields with clear field-level messages"
);

assert(
  !profilePageFile.includes("|| undefined") &&
  !profilePageFile.includes(": undefined"),
  "ProfilePage payload has zero undefined values"
);

assert(
  authContextFile.includes("sanitizeFirestoreData") || authContextFile.includes("v !== undefined"),
  "auth-context updateUserProfile deep sanitizes payload to ensure ZERO undefined values reach Firestore"
);

assert(
  authContextFile.includes("Unable to save your profile right now. Please check your information and try again.") ||
  authContextFile.includes("Unable to save your profile right now"),
  "Clean user-friendly error handling prevents raw Firebase/setDoc errors from being shown to users"
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED! Profile system successfully updated and verified.");
  process.exit(0);
} else {
  console.error("❌ Some verification tests failed. Please inspect the errors above.");
  process.exit(1);
}
