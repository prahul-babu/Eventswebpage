# 🎓 Apollo University Event Hub — Student User Guide

Welcome to the **Apollo University Event Hub**! This guide walks you through signing in, exploring campus events, booking passes, completing online payments, and downloading participation certificates.

---

## 1. Signing In & Account Activation
1. Navigate to **[https://events.apollouniversity.edu.in](https://events.apollouniversity.edu.in)**.
2. Click **"Continue with Microsoft"** and authenticate using your official `@student.apollouniversity.edu.in` university email account.
3. If this is your first time logging in:
   - Verify your pre-filled name, roll number, and department.
   - Click **"Submit Registration"**.
   - Your account is activated instantly (or routed to admin review if your roster entry is pending).

---

## 2. Browsing Campus Events
- **Student Home (`/`)**: Displays personalized greetings, the **"Live Right Now"** pulsing strip of ongoing campus events, and upcoming highlights.
- **Event Catalog (`/events`)**:
  - Filter by category (**Technical, Cultural, Sports, Workshops, Hackathons, Seminars**).
  - Filter by mode (**In-Person, Online, Hybrid**).
  - Filter by price (**Free Entry vs Paid Events**).
  - Search by keywords or organizing departments.

---

## 3. Registering for Events & Purchasing Tickets
1. Click on any event card to view full event details, eligibility, prerequisites, and schedules.
2. Click **"Register Now"**.
3. **Free Events**:
   - Your pass is confirmed instantly.
   - Your digital QR ticket is generated immediately.
4. **Paid Events**:
   - You will be redirected to the secure **Checkout Page (`/checkout/:registrationId`)**.
   - Review the order summary and click **"Pay with Razorpay"**.
   - Complete payment using UPI (GPay/PhonePe/Paytm), Debit/Credit Card, Net Banking, or Wallets.
   - On payment verification, your ticket is marked **CONFIRMED** and receipt generated.

---

## 4. Viewing Tickets & Calendar Sync
- Navigate to **"My Registrations"** (`/my-registrations`).
- View all **Confirmed**, **Pending Payment**, and **Past** event passes.
- Click **"View Ticket Pass"** (`/tickets/:registrationId`):
  - **Single-Hand QR Code**: Show this QR at the venue gate for instant check-in.
  - **Save to Apple / Google Calendar (`.ics`)**: 1-click sync to your device calendar.
  - **Download PDF Receipt**: Download official tax receipt with Transaction ID.

---

## 5. Participation Transcript & Certificates (`/my-participation`)
- Navigate to **"My Transcript"** in the top navigation.
- View total campus events attended, accredited extracurricular hours, and category breakdown.
- Click **"Download Certificate"** next to any completed event to download an official **The Apollo University Certificate of Participation (PDF)**.
