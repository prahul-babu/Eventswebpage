# 👨‍🏫 Apollo University Event Hub — Faculty & Staff User Guide

Welcome to the **Apollo University Faculty Event Management Portal**. This guide covers creating events, managing registrations, conducting live QR attendance check-in, and submitting post-event accreditation reports.

---

## 1. Faculty Dashboard (`/faculty`)
- View real-time stat cards: **Total Events, Pending Approval, Published Events, Total Registrations, and Revenue Collected**.
- **Needs Your Attention Panel**:
  - Events pending revision / rejected by Admin with review notes.
  - Completed events requiring NAAC / NBA Post-Event Reports.
  - Events closing registrations within 48 hours.

---

## 2. Creating New Events (`/faculty/events/new`)
Use the 4-step wizard with real-time validation:
1. **Step 1: Basics**
   - Title, Category, Short Summary (max 200 chars), Description (rich-text TipTap editor), Tags, and 16:9 banner image upload.
2. **Step 2: Schedule & Venue**
   - Event Mode (In-Person / Online / Hybrid).
   - Campus Building & Hall selector (with auto-capacity filling).
   - Multi-day sessions or single date with Start/End times.
   - Registration Start & End deadlines.
3. **Step 3: Registration & Pricing**
   - Capacity (total seats).
   - Pricing Type (Free vs Paid).
   - Ticket Price in INR (if paid).
   - Eligibility restrictions (School / Department / Minimum Year).
4. **Step 4: Review & Submission**
   - Live preview card.
   - Click **"Save as Draft"** (autosaves every 30 seconds) or **"Submit for Admin Approval"**.

---

## 3. Managing Attendees & Mobile QR Check-In
- **Registrants Table (`/faculty/events/:eventId/registrants`)**:
  - View all student bookings, payment status, roll numbers, and attendance state.
  - Export full attendee roster as CSV.
- **Mobile QR Scanner Gate (`/faculty/events/:eventId/check-in`)**:
  - Open on any mobile phone or tablet.
  - Point camera at student ticket QR codes.
  - **Green banner & chime**: Successful check-in.
  - **Amber warning**: Duplicate scan showing original check-in timestamp.
  - **Manual Roster Tab**: Instant search by roll number with a **5-minute Undo** window.

---

## 4. Post-Event Report Builder (`/faculty/events/:eventId/report`)
- Structured 7-section form aligned with **NAAC Criterion 5** and **NBA Accreditation**:
  - Executive Summary, Objectives & Outcomes (1-to-1 mapping).
  - Speaker / Chief Guest Profiles.
  - Attendance Breakdown & Demographics.
  - Financial Statements (Revenue Realized vs Expenditure).
  - High-Resolution Geotagged Media Gallery.
  - Feedback Summary & Rating distribution.
  - Faculty Coordinator Sign-off.
- Click **"Download NAAC / NBA Report PDF"** for automated compilation.
- Click **"Submit Report for Admin Review"**.
