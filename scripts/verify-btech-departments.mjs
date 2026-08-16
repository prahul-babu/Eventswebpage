/**
 * Automated Verification Script: B.Tech Departments & Streams Ecosystem
 * Ensures complete removal of non-B.Tech options (Management, Health Sciences, General Administration)
 * and verifies that B.Tech departments and specializations are fully operational.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

console.log('\n======================================================');
console.log('  APOLLO EVENT HUB: B.TECH DEPARTMENTS VERIFICATION');
console.log('======================================================\n');

const rootDir = process.cwd();

// Test 1: Verify types/user.ts
console.log('1. Testing src/types/user.ts definitions...');
const userTypesContent = readFileSync(resolve(rootDir, 'src/types/user.ts'), 'utf-8');

assert(!userTypesContent.includes('"School of Management"'), 'No "School of Management" in user.ts');
assert(!userTypesContent.includes('"School of Health Sciences"'), 'No "School of Health Sciences" in user.ts');
assert(!userTypesContent.includes('"General Administration"'), 'No "General Administration" in user.ts');
assert(!userTypesContent.includes('MBA / MHA'), 'No "MBA / MHA" in ACADEMIC_YEARS in user.ts');
assert(userTypesContent.includes('Department of Computer Science & Engineering'), 'Contains B.Tech CSE department');
assert(userTypesContent.includes('Department of AI & Data Science'), 'Contains B.Tech AI & DS department');
assert(userTypesContent.includes('Department of Cyber Security'), 'Contains B.Tech Cyber Security department');
assert(userTypesContent.includes('B.Tech. Computer Science and Engineering'), 'Contains B.Tech CSE stream');

// Test 2: Verify src/config/departments.ts
console.log('\n2. Testing src/config/departments.ts configuration...');
const deptConfigContent = readFileSync(resolve(rootDir, 'src/config/departments.ts'), 'utf-8');

assert(deptConfigContent.includes('BTECH_FACULTY_DEPARTMENTS'), 'Defines BTECH_FACULTY_DEPARTMENTS');
assert(deptConfigContent.includes('BTECH_STUDENT_SPECIALIZATIONS'), 'Defines BTECH_STUDENT_SPECIALIZATIONS');
assert(deptConfigContent.includes('FORBIDDEN_NON_BTECH_KEYWORDS'), 'Defines FORBIDDEN_NON_BTECH_KEYWORDS');
assert(deptConfigContent.includes('isForbiddenNonBTechDepartment'), 'Exports isForbiddenNonBTechDepartment validator');

// Test 3: Verify src/lib/schemas/user.ts
console.log('\n3. Testing src/lib/schemas/user.ts schema validation...');
const schemaContent = readFileSync(resolve(rootDir, 'src/lib/schemas/user.ts'), 'utf-8');
assert(schemaContent.includes('isForbiddenNonBTechDepartment'), 'departmentSchema uses isForbiddenNonBTechDepartment');

// Test 4: Verify LoginPage.tsx
console.log('\n4. Testing src/pages/LoginPage.tsx...');
const loginContent = readFileSync(resolve(rootDir, 'src/pages/LoginPage.tsx'), 'utf-8');
assert(!loginContent.includes('School of Technology - General Administration'), 'LoginPage does not have General Administration');
assert(loginContent.includes('BTECH_FACULTY_DEPARTMENTS'), 'LoginPage uses BTECH_FACULTY_DEPARTMENTS');

// Test 5: Verify OnboardingPage.tsx
console.log('\n5. Testing src/pages/OnboardingPage.tsx...');
const onboardingContent = readFileSync(resolve(rootDir, 'src/pages/OnboardingPage.tsx'), 'utf-8');
assert(!onboardingContent.includes('"School of Management"'), 'OnboardingPage has no School of Management');
assert(onboardingContent.includes('BTECH_SPECIALIZATIONS'), 'OnboardingPage has BTECH_SPECIALIZATIONS');
assert(onboardingContent.includes('BTECH_FACULTY_DEPARTMENTS'), 'OnboardingPage has BTECH_FACULTY_DEPARTMENTS');

// Test 6: Verify AdminUserProfilePage.tsx & AdminUserImportPage.tsx
console.log('\n6. Testing Admin Pages...');
const adminUserImportContent = readFileSync(resolve(rootDir, 'src/pages/admin/AdminUserImportPage.tsx'), 'utf-8');
assert(!adminUserImportContent.includes('General Administration'), 'AdminUserImportPage has no General Administration');
assert(adminUserImportContent.includes('isForbiddenNonBTechDepartment'), 'AdminUserImportPage validates against forbidden departments');

const adminUserProfileContent = readFileSync(resolve(rootDir, 'src/pages/admin/AdminUserProfilePage.tsx'), 'utf-8');
assert(adminUserProfileContent.includes('Select B.Tech Department'), 'AdminUserProfilePage has B.Tech department select');

// Test 7: Verify Cloud Functions
console.log('\n7. Testing Cloud Functions...');
const resolveUserContent = readFileSync(resolve(rootDir, 'functions/src/auth/resolveUser.ts'), 'utf-8');
assert(!resolveUserContent.includes('"General Administration"'), 'resolveUser.ts does not fallback to General Administration');

const requestAccessContent = readFileSync(resolve(rootDir, 'functions/src/auth/requestAccess.ts'), 'utf-8');
assert(requestAccessContent.includes('FORBIDDEN_NON_BTECH_KEYWORDS'), 'requestAccess.ts validates against non-B.Tech keywords');

const submitEventContent = readFileSync(resolve(rootDir, 'functions/src/events/submitEventForApproval.ts'), 'utf-8');
assert(submitEventContent.includes('FORBIDDEN_NON_BTECH'), 'submitEventForApproval.ts validates against non-B.Tech');

// Test 8: Scan all frontend src/ files for any hardcoded non-B.Tech selectable options
console.log('\n8. Scanning src/ directory for forbidden non-B.Tech options...');
function scanDirectory(dir) {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = readFileSync(fullPath, 'utf-8');
      if (content.includes('"School of Management"') || content.includes("'School of Management'")) {
        assert(false, `Found "School of Management" in ${file}`);
      }
      if (content.includes('"School of Health Sciences"') || content.includes("'School of Health Sciences'")) {
        assert(false, `Found "School of Health Sciences" in ${file}`);
      }
    }
  }
}

scanDirectory(resolve(rootDir, 'src'));
assert(true, 'No "School of Management" or "School of Health Sciences" found in any src/ file');

console.log(`\n======================================================`);
console.log(`  SUMMARY: ${passedTests}/${totalTests} Tests Passed`);
console.log(`======================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
