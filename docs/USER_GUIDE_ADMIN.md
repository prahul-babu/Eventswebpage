# 🛡️ Apollo University Event Hub — Administrator User Guide

This guide details campus administrator workflows for identity governance, event review gates, NAAC/NBA report approvals, user roster imports, and system configuration.

---

## 1. Administrator Dashboard (`/admin`)
- Real-time stat cards with direct links to operational queues.
- Monthly Event Volume (Stacked Bar by Status) & Registration Trends.
- Live system audit trail feed from `audit_logs`.

---

## 2. Access Requests Queue (`/admin/users/requests`)
- Review self-onboarding applications from `@apollouniversity.edu.in` accounts.
- View requester's name, email, department, roll/employee ID, and waiting duration:
  - `< 2 days`: Neutral
  - `2–5 days`: Amber warning
  - `> 5 days`: Red escalation
- **Actions**:
  - **Approve**: Assigns requested role and sets user status to `ACTIVE`.
  - **Approve as Different Role**: Corrects role if an applicant misselected student/faculty.
  - **Reject**: Requires a written rejection reason (&ge;10 characters) and sends email notification.

---

## 3. User Directory & Bulk Roster Import (`/admin/users`)
- **Directory**: Full table with search, role filters, status filters, and row action menus.
- **Deep User Profile (`/admin/users/:uid`)**: View user history, events hosted, registrations, and payments.
- **Roster Allowlist Import (`/admin/users/import`)**:
  - Upload CSV rosters with columns: `email, role, department, rollNumber, employeeId, displayName`.
  - Automatic client-side validation (domain syntax check, duplicate detection).
  - High-performance chunked server execution (400 records per Firestore batch write).

---

## 4. Event Approval Queue (`/admin/approvals`)
- Split-screen review screen at `/admin/approvals/:eventId`:
  - **Left**: Live preview of student-facing event page.
  - **Right**: Decision panel with organiser history, quality checklist, and **Venue Conflict Detector** (queries active bookings in the same hall during overlapping timeslots).
- **Actions**: **Approve (Publishes instantly)** or **Reject (Requires feedback note)**.

---

## 5. Post-Event Reports Archive (`/admin/reports`)
- Comprehensive archive of completed event reports for institutional accreditation.
- Review submitted dossiers at `/admin/reports/:eventId`.
- **Accreditation Export**: 1-click **"Export AQAR Dataset (CSV)"** compiling criteria-compliant data across all approved reports.

---

## 6. System Settings & Governance (`/admin/settings`)
- Configure current academic year (`2025-26`).
- Allowed email domain whitelist chips.
- Payment Gateway Kill Switch & Razorpay API key configuration.
- Campus Maintenance Mode toggle with broadcast banner.
- Refund policy guidelines & Category definitions.
- **Audit Logs (`/admin/audit-logs`)**: Searchable, immutable log of all privileged administrative and financial actions.
