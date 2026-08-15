# The Apollo University — Event Hub Platform

> **The Apollo University** official campus event discovery, ticketing, payments, faculty lifecycle wizard, NAAC/NBA accreditation reports, and institutional analytics platform.

---

## 🏛️ Comprehensive Architecture & Modules

The platform is designed and built following a 15-module enterprise architecture:

- **Module 0: Platform Foundation & Repository Bootstrap**: Vite + React 18 + TypeScript strict setup, Tailwind CSS design system with curated Apollo Indigo (`#312E81`) and Amber Gold (`#FBBF24`) palette, custom shadcn/ui components.
- **Module 1: Infrastructure, Firebase & Local Development**: Firestore rules, Cloud Storage rules, Firebase Emulator Suite configuration with 1-click test seeds.
- **Module 2: Identity, Authentication & Microsoft SSO**: Microsoft Entra ID Single Sign-On via Firebase Auth OAuthProvider with `@apollouniversity.edu.in` domain guard.
- **Module 3: Role Resolution, Onboarding Gate & Access Requests**: Server-side role resolution (`resolveUser`, `requestAccess`, `setUserRole`), live status gating (`ACTIVE`, `PENDING`, `REJECTED`, `BLOCKED`).
- **Module 4: Application Shell, Navigation & Layouts**: Role-aware navigation (`StudentLayout`, `FacultyLayout`, `AdminLayout`), live notification bell, and responsive profile dropdown.
- **Module 5: Student Portal — Discovery & Home**: Personalized greeting, pulsing "Live Right Now" ongoing event strip, category filter catalog with debounced search.
- **Module 6: Event Detail Page & Registration Machine**: Rich event details, sanitised HTML descriptions, photo gallery, seats-remaining meter, registration countdown, and waitlist promotion.
- **Module 7: Payments, Tickets & Receipts**: Server-side Razorpay integration (`createPaymentOrder`, `verifyPayment` HMAC SHA-256, `razorpayWebhook` with idempotency, `initiateRefund`), QR ticket pass, PDF tax receipts, and `.ics` calendar sync.
- **Module 8: Faculty Portal — Event Creation & Management**: Faculty dashboard, 4-step wizard with TipTap rich text, 16:9 crop tool, 30s autosave, attendee roster with attendance tracker.
- **Module 9: Admin Approval Workflow & Review Gate**: Approvals queue with SLA color indicators, split-screen review dossier with venue clash detector, Cloud Functions `approveEvent`, `rejectEvent`, `bulkApproveEvents`.
- **Module 10: Post-Event Reporting & Institutional Accreditation**: 7-section report builder with NAAC Criterion 5 and NBA alignment, automated Apollo PDF report generator (`jsPDF` + `jspdf-autotable`), AQAR CSV export.
- **Module 11: Admin Console — Users, Governance & Oversight**: User directory, deep user profiles, roster allowlist CSV importer with chunked 400-record batch writes, system settings singleton with payment kill switch and maintenance banner, master immutable audit trail (`audit_logs`).
- **Module 12: Unified Notification & Email Engine**: Central `notify()` dispatcher, 16 responsive university HTML email templates, Firebase Trigger Email queue with retry scheduler (`retryFailedEmails`), 24h/1h event reminder cron (`sendEventReminders`), 60-day cleanup (`cleanupOldNotifications`), notification preferences page (`/profile/notifications`) with Web Push FCM.
- **Module 13: Attendance, Dashboards & Analytics**: Single-hand mobile QR viewfinder with torch toggle (`html5-qrcode`), Web Audio API chimes (success chime, duplicate alert, error buzz) and haptic vibration, idempotent `checkInAttendee` with 5-min undo, Student Transcript (`/my-participation`) with participation certificates, Faculty Event Intelligence (`/faculty/events/:eventId/analytics`), Institutional Admin Analytics (`/admin/analytics`), and midnight `computeDailyAnalytics` cron.
- **Module 14: Hardening, Testing & Deployment**:
  - 15-test security rules matrix test suite with `@firebase/rules-unit-testing` covering all roles and denial assertions (**15/15 passed**).
  - Firebase App Check with reCAPTCHA Enterprise and debug token path.
  - Server-side sliding-window rate limiting on `requestAccess`, `createRegistration`, `createPaymentOrder`.
  - Content Security Policy and security headers in `firebase.json`.
  - React Error Boundaries with correlation trace IDs (`err_...`).
  - Bundle optimization with `rollup-plugin-visualizer` (`dist/stats.html`).
  - Service Worker for offline shell caching (`public/sw.js`).
  - Automated daily Firestore backup Cloud Function (`backupFirestore`).
  - Full CI/CD GitHub Actions pipeline (`.github/workflows/ci-cd.yml`).
  - Institutional documentation (`docs/USER_GUIDE_STUDENT.md`, `docs/USER_GUIDE_FACULTY.md`, `docs/USER_GUIDE_ADMIN.md`, `docs/RUNBOOK.md`) and In-App Help Center (`/help`).

---

## 🚀 Running Locally

### 1. Start Firebase Emulators
```bash
npx firebase-tools emulators:start
```
- Auth Emulator: `http://localhost:9099`
- Firestore Emulator: `http://localhost:8080`
- Functions Emulator: `http://localhost:5001`
- Emulator UI: **`http://localhost:4000`**

### 2. Run Firestore Security Rules Tests
```bash
npx vitest run test/rules.test.ts
```

### 3. Start Frontend Dev Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** (or port 5175).

### 4. Demo Quick-Login
On the login screen (`/login`), click any persona button under **Demo Quick-Login** to instantly sign in as:
- 🎓 **Student Persona** (Rahul Sharma)
- 👨‍🏫 **Faculty Persona** (Dr. Priya Nair)
- 🛡️ **Admin Persona** (Dean / Administrator)
