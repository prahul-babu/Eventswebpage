import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled Cron: computeDailyAnalytics
 * Runs every midnight (00:05 AM IST) to precompute daily platform aggregates
 * into analytics/daily/{yyyy-MM-dd} and updates analytics/summary.
 */
export const computeDailyAnalytics = onSchedule(
  {
    schedule: "5 0 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    console.log(`[computeDailyAnalytics] Precomputing daily institutional analytics for: ${dateKey}`);

    // 1. Fetch Users, Events, Registrations
    const [usersSnap, eventsSnap, regsSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("events").get(),
      db.collection("registrations").get(),
    ]);

    const totalUsers = usersSnap.size;
    let studentCount = 0;
    let facultyCount = 0;
    const studentUids = new Set<string>();

    usersSnap.docs.forEach((d) => {
      const u = d.data();
      if (u.role === "student") {
        studentCount++;
        studentUids.add(d.id);
      } else if (u.role === "faculty") {
        facultyCount++;
      }
    });

    const totalEvents = eventsSnap.size;
    let publishedEvents = 0;
    let completedEvents = 0;
    const eventsByCategory: Record<string, number> = {};
    const eventsByDepartment: Record<string, number> = {};
    const organiserCounts: Record<string, { name: string; email: string; eventsCount: number; registrationsCount: number }> = {};

    eventsSnap.docs.forEach((d) => {
      const ev = d.data();
      if (ev.status === "PUBLISHED" || ev.status === "ONGOING") publishedEvents++;
      if (ev.status === "COMPLETED") completedEvents++;

      const cat = ev.category || "Other";
      eventsByCategory[cat] = (eventsByCategory[cat] || 0) + 1;

      const dept = ev.department || "General";
      eventsByDepartment[dept] = (eventsByDepartment[dept] || 0) + 1;

      const orgId = ev.organiserId;
      if (orgId) {
        if (!organiserCounts[orgId]) {
          organiserCounts[orgId] = {
            name: ev.organiserName || "Faculty",
            email: ev.organiserEmail || "",
            eventsCount: 0,
            registrationsCount: 0,
          };
        }
        organiserCounts[orgId].eventsCount++;
        organiserCounts[orgId].registrationsCount += Number(ev.registeredCount) || 0;
      }
    });

    const totalRegistrations = regsSnap.size;
    let totalAttended = 0;
    let totalRevenue = 0;
    const attendedStudents = new Set<string>();

    regsSnap.docs.forEach((d) => {
      const r = d.data();
      if (r.checkedIn || r.status === "ATTENDED") {
        totalAttended++;
        if (r.userId && studentUids.has(r.userId)) {
          attendedStudents.add(r.userId);
        }
      }
      if (r.isPaid && r.amountPaid) {
        totalRevenue += Number(r.amountPaid) || 0;
      }
    });

    const attendanceRate = totalRegistrations > 0 ? (totalAttended / totalRegistrations) * 100 : 0;
    const studentEngagementRate = studentCount > 0 ? (attendedStudents.size / studentCount) * 100 : 0;

    const topOrganisers = Object.entries(organiserCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.eventsCount - a.eventsCount)
      .slice(0, 10);

    const payload = {
      date: dateKey,
      totalUsers,
      studentCount,
      facultyCount,
      totalEvents,
      publishedEvents,
      completedEvents,
      totalRegistrations,
      totalAttended,
      totalRevenue,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      studentEngagementRate: Math.round(studentEngagementRate * 10) / 10,
      eventsByCategory,
      eventsByDepartment,
      topOrganisers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save Daily Snapshot
    await db.collection("analytics").doc("daily").collection("snapshots").doc(dateKey).set(payload, { merge: true });

    // Save Global Summary Document
    await db.collection("analytics").doc("summary").set(payload, { merge: true });

    console.log(`[computeDailyAnalytics] Successfully updated daily analytics & global summary.`);
  }
);
