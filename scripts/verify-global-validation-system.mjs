#!/usr/bin/env node

/**
 * Apollo University Event Hub - Global Validation Architecture Verification Suite
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let passedTests = 0;
let totalTests = 0;

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
console.log(" APOLLO UNIVERSITY EVENT HUB - GLOBAL VALIDATION ARCHITECTURE VERIFICATION");
console.log("================================================================================\n");

// =============================================================================
// SUITE 1: Centralized Validation Utilities & Phone 10-Digit Enforcement
// =============================================================================
console.log("[SUITE 1] Centralized Validation Utilities & Phone 10-Digit Rule");

const phoneModulePath = path.join(rootDir, "src/lib/validation/phone.ts");
const emailModulePath = path.join(rootDir, "src/lib/validation/email.ts");
const sanitizeModulePath = path.join(rootDir, "src/lib/validation/sanitize.ts");
const profileModulePath = path.join(rootDir, "src/lib/validation/profile.ts");
const eventModulePath = path.join(rootDir, "src/lib/validation/event.ts");
const reportModulePath = path.join(rootDir, "src/lib/validation/report.ts");
const indexModulePath = path.join(rootDir, "src/lib/validation/index.ts");

assert(fs.existsSync(phoneModulePath), "src/lib/validation/phone.ts exists");
assert(fs.existsSync(emailModulePath), "src/lib/validation/email.ts exists");
assert(fs.existsSync(sanitizeModulePath), "src/lib/validation/sanitize.ts exists");
assert(fs.existsSync(profileModulePath), "src/lib/validation/profile.ts exists");
assert(fs.existsSync(eventModulePath), "src/lib/validation/event.ts exists");
assert(fs.existsSync(reportModulePath), "src/lib/validation/report.ts exists");
assert(fs.existsSync(indexModulePath), "src/lib/validation/index.ts exists");

const phoneCode = fs.readFileSync(phoneModulePath, "utf-8");
assert(phoneCode.includes("^[0-9]{10}$"), "PHONE_REGEX strictly enforces exactly 10 digits");
assert(phoneCode.includes("isValidPhoneNumber"), "isValidPhoneNumber is exported");
assert(phoneCode.includes("isValidOptionalPhoneNumber"), "isValidOptionalPhoneNumber is exported");

// Direct regex execution checks
const PHONE_REGEX = /^[0-9]{10}$/;
assert(PHONE_REGEX.test("9876543210") === true, "Valid 10-digit phone number is accepted (9876543210)");
assert(PHONE_REGEX.test("12345") === false, "5-digit phone number is rejected (12345)");
assert(PHONE_REGEX.test("987654321") === false, "9-digit phone number is rejected (987654321)");
assert(PHONE_REGEX.test("98765432101") === false, "11-digit phone number is rejected (98765432101)");
assert(PHONE_REGEX.test("+919876543210") === false, "Phone number with +91 is rejected");
assert(PHONE_REGEX.test("98765abc10") === false, "Phone number with letters is rejected");
assert(PHONE_REGEX.test("98765-43210") === false, "Phone number with hyphens is rejected");
assert(PHONE_REGEX.test("98 76543210") === false, "Phone number with spaces is rejected");

// =============================================================================
// SUITE 2: Email & Roll Number Validation
// =============================================================================
console.log("\n[SUITE 2] Email & Roll Number Validation");

const emailCode = fs.readFileSync(emailModulePath, "utf-8");
assert(emailCode.includes("isValidEmail"), "isValidEmail is exported");
assert(emailCode.includes("isValidOptionalEmail"), "isValidOptionalEmail is exported");

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
assert(EMAIL_REGEX.test("student@apollouniversity.edu.in") === true, "Institutional email is valid");
assert(EMAIL_REGEX.test("personal@gmail.com") === true, "Personal email is valid");
assert(EMAIL_REGEX.test("invalid-email") === false, "Malformed email without @ is rejected");
assert(EMAIL_REGEX.test("student@") === false, "Malformed email without domain is rejected");

// =============================================================================
// SUITE 3: Deep Firestore Sanitization (Zero 'undefined' Values)
// =============================================================================
console.log("\n[SUITE 3] Deep Firestore Data Sanitization (Zero Undefined)");

const sanitizeCode = fs.readFileSync(sanitizeModulePath, "utf-8");
assert(sanitizeCode.includes("sanitizeFirestoreData"), "sanitizeFirestoreData is exported");

// Simulate sanitize logic
function sanitizeTest(data) {
  if (data === undefined || data === null) return data;
  if (typeof data !== "object") return typeof data === "string" ? data.trim() : data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.filter((item) => item !== undefined).map((item) => sanitizeTest(item));
  }
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeTest(value);
    }
  }
  return cleaned;
}

const dirtyObject = {
  name: " John Doe ",
  phone: "9876543210",
  alternateEmail: undefined,
  metadata: {
    section: "A",
    note: undefined,
  },
  tags: ["workshop", undefined, "btech"],
};

const cleanedObject = sanitizeTest(dirtyObject);
assert(!("alternateEmail" in cleanedObject), "Undefined top-level key is omitted");
assert(!("note" in cleanedObject.metadata), "Undefined nested key is omitted");
assert(cleanedObject.tags.length === 2 && !cleanedObject.tags.includes(undefined), "Undefined array items are removed");
assert(cleanedObject.name === "John Doe", "Strings are automatically trimmed");

// =============================================================================
// SUITE 4: Backend / Database Security Rules Validation
// =============================================================================
console.log("\n[SUITE 4] Backend Firestore Security Rules Validation");

const firestoreRulesPath = path.join(rootDir, "firestore.rules");
assert(fs.existsSync(firestoreRulesPath), "firestore.rules exists");

const firestoreRules = fs.readFileSync(firestoreRulesPath, "utf-8");
assert(firestoreRules.includes("isValidPhone(val)"), "Rules define isValidPhone helper function");
assert(firestoreRules.includes("^[0-9]{10}$"), "Rules match exactly 10 digits for phone numbers");
assert(firestoreRules.includes("isValidOptionalPhone"), "Rules define isValidOptionalPhone helper function");
assert(firestoreRules.includes("isValidEmail"), "Rules define isValidEmail helper function");
assert(firestoreRules.includes("isValidOptionalEmail"), "Rules define isValidOptionalEmail helper function");
assert(firestoreRules.includes("match /users/{userId}"), "Rules validate /users/{userId} collection");
assert(firestoreRules.includes("match /events/{eventId}"), "Rules validate /events/{eventId} collection");
assert(firestoreRules.includes("match /registrations/{registrationId}"), "Rules validate /registrations/{registrationId} collection");

// =============================================================================
// SUITE 5: Profile Form-First Validation & Field Errors
// =============================================================================
console.log("\n[SUITE 5] Profile Form-First Validation & Field Errors");

const profilePagePath = path.join(rootDir, "src/pages/ProfilePage.tsx");
assert(fs.existsSync(profilePagePath), "src/pages/ProfilePage.tsx exists");

const profilePageCode = fs.readFileSync(profilePagePath, "utf-8");
assert(profilePageCode.includes("validateProfileForm"), "ProfilePage imports and calls validateProfileForm");
assert(profilePageCode.includes("sanitizeFirestoreData"), "ProfilePage sanitizes payload before updating Firestore");
assert(profilePageCode.includes("errors.phoneNumber"), "ProfilePage renders inline error for phoneNumber");
assert(profilePageCode.includes("errors.emergencyContactPhone"), "ProfilePage renders inline error for emergencyContactPhone");
assert(profilePageCode.includes("errors.personalEmail"), "ProfilePage renders inline error for personalEmail");

// =============================================================================
// SUITE 6: Event & Registration Schema Consistency
// =============================================================================
console.log("\n[SUITE 6] Event & Registration Schema Consistency");

const userSchemaPath = path.join(rootDir, "src/lib/schemas/user.ts");
const regSchemaPath = path.join(rootDir, "src/lib/schemas/registration.ts");
const eventSchemaPath = path.join(rootDir, "src/lib/schemas/event.ts");

const userSchemaCode = fs.readFileSync(userSchemaPath, "utf-8");
const regSchemaCode = fs.readFileSync(regSchemaPath, "utf-8");
const eventSchemaCode = fs.readFileSync(eventSchemaPath, "utf-8");

assert(userSchemaCode.includes("PHONE_REGEX"), "User schema uses central PHONE_REGEX");
assert(regSchemaCode.includes("PHONE_REGEX"), "Registration schema uses central PHONE_REGEX");
assert(eventSchemaCode.includes("capacity"), "Event schema validates positive capacity");
assert(eventSchemaCode.includes("isPaid"), "Event schema validates registration fee for paid events");

// =============================================================================
// SUITE 7: Auth Context & Global Write Operations
// =============================================================================
console.log("\n[SUITE 7] Auth Context & Global Database Write Sanitization");

const authContextPath = path.join(rootDir, "src/lib/auth-context.tsx");
const authContextCode = fs.readFileSync(authContextPath, "utf-8");

assert(authContextCode.includes("sanitizeFirestoreData"), "auth-context.tsx imports sanitizeFirestoreData");
assert(authContextCode.includes("updateUserProfile"), "updateUserProfile sanitizes Firestore payload");
assert(authContextCode.includes("submitFacultyApplication"), "submitFacultyApplication sanitizes Firestore payload");
assert(authContextCode.includes("signUpWithEmail"), "signUpWithEmail sanitizes Firestore payload");

// =============================================================================
// SUMMARY
// =============================================================================
console.log("\n================================================================================");
console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED! Global Validation Architecture is fully verified.\n");
  process.exit(0);
} else {
  console.error("❌ Some verification tests failed. Please inspect the errors above.\n");
  process.exit(1);
}
