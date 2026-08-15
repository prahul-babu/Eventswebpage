# 🛠️ Apollo University Event Hub — Engineering Runbook

This document specifies emergency operational procedures, disaster recovery, database restoration, secret rotation, and incident escalation protocols.

---

## 1. Disaster Recovery & Firestore Database Restore

### Automated Backups
- Scheduled daily at **02:00 AM IST** by Cloud Function `backupFirestore` to Google Cloud Storage bucket: `gs://apollo-event-hub-firestore-backups/`.
- Retention Policy: 30-day object lifecycle deletion rule.

### Emergency Database Restore Procedure
In the event of accidental data corruption or disaster recovery:
1. Identify the desired backup timestamp from the GCS bucket:
   ```bash
   gcloud storage ls gs://apollo-event-hub-firestore-backups/
   # Example: gs://apollo-event-hub-firestore-backups/2026-08-14T02:00:00_12345/
   ```
2. Put the platform into maintenance mode via `/admin/settings` or run:
   ```bash
   npx firebase-tools firestore:update settings/config --data '{"maintenanceMode": true}'
   ```
3. Import the backup data into Firestore using `gcloud`:
   ```bash
   gcloud firestore import gs://apollo-event-hub-firestore-backups/[BACKUP_TIMESTAMP_DIR] --project=apollo-event-hub-prod
   ```
4. Verify data integrity in the Firebase Console or Firestore Admin interface.
5. Disable maintenance mode.

---

## 2. Payment Gateway Kill Switch & Razorpay Outages

### Immediate Kill Switch Activation
If Razorpay experiences platform instability, webhook delivery failures, or fraudulent attempts:
1. Navigate to `/admin/settings` as an Admin.
2. Toggle **"Online Payments Enabled"** to **OFF**.
3. Click **"Save Settings"**.
4. The server-side callable `createPaymentOrder` immediately rejects all new order creations with a friendly maintenance message, while preserving all existing confirmed registrations.

### Processing Manual Refunds
1. Locate the registration on `/admin/reports` or query `payments/{paymentId}` in Firestore.
2. Call the server-side refund utility `initiateRefund` with `{ paymentId, reason }`.
3. The Cloud Function executes the Razorpay Refund API and sets payment status to `REFUNDED`.

---

## 3. Secret Rotation Protocols

### Rotating Razorpay Webhook Secret & API Keys
1. Generate new API Key Pair & Webhook Secret in the **Razorpay Dashboard** under `Settings > API Keys`.
2. Update Google Cloud Secret Manager / Firebase Environment Configuration:
   ```bash
   firebase functions:secrets:set RAZORPAY_KEY_ID="rzp_live_..."
   firebase functions:secrets:set RAZORPAY_KEY_SECRET="sec_..."
   firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET="whsec_..."
   ```
3. Redeploy Cloud Functions:
   ```bash
   firebase deploy --only functions
   ```
4. In `/admin/settings`, update the public `Razorpay Key ID` for client-side checkout modal initialization.

### Rotating Microsoft Entra ID SSO Credentials
1. Navigate to **Microsoft Entra ID > App Registrations > Apollo Event Hub**.
2. Generate a new Client Secret under `Certificates & Secrets`.
3. In **Firebase Console > Authentication > Sign-in method > Microsoft**:
   - Update Application ID & Application Secret.
4. Verify SSO login across dev and prod environments.

---

## 4. Rate Limiting & Abuse Mitigation

- **Thresholds**:
  - `requestAccess`: 3 attempts / 60 seconds per user UID.
  - `createRegistration`: 5 attempts / 60 seconds per user UID.
  - `createPaymentOrder`: 5 attempts / 60 seconds per user UID.
- If a user triggers a rate limit, the client receives `resource-exhausted` HTTP 429 status and displays a cooldown timer.
- To unblock a legitimate user in an emergency, delete the document `rate_limits/{uid}_{action}` in Firestore.
