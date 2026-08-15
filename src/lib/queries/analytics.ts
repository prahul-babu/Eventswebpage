import { useQuery } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, differenceInHours } from "date-fns";

export interface StudentParticipationStats {
  totalAttended: number;
  totalRegistered: number;
  totalHours: number;
  categoryDonut: { name: string; value: number; color: string }[];
  attendedTimeline: {
    eventId: string;
    eventTitle: string;
    category: string;
    date: Date;
    venue: string;
    durationHours: number;
    hasCertificate: boolean;
    ticketCode: string;
  }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Technical: "#4f46e5", // Indigo
  Cultural: "#ec4899", // Pink
  Sports: "#10b981", // Emerald
  Academic: "#f59e0b", // Amber
  Workshop: "#06b6d4", // Cyan
  Hackathon: "#8b5cf6", // Purple
  Seminar: "#64748b", // Slate
  Other: "#3b82f6", // Blue
};

/**
 * Hook: useStudentParticipation
 */
export function useStudentParticipation(userId?: string) {
  return useQuery({
    queryKey: ["analytics", "studentParticipation", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<StudentParticipationStats> => {
      if (!userId) {
        return {
          totalAttended: 0,
          totalRegistered: 0,
          totalHours: 0,
          categoryDonut: [],
          attendedTimeline: [],
        };
      }

      // Fetch all student registrations
      const regsSnap = await getDocs(
        query(collection(db, "registrations"), where("userId", "==", userId))
      );

      const registrations = regsSnap.docs.map((d) => d.data());
      const attendedRegs = registrations.filter(
        (r) => r.checkedIn || r.status === "ATTENDED"
      );

      // Fetch unique events attended
      const eventIds = Array.from(new Set(attendedRegs.map((r) => r.eventId).filter(Boolean)));

      const eventDocs = await Promise.all(
        eventIds.map(async (id) => {
          try {
            const evSnap = await getDoc(doc(db, "events", id));
            return evSnap.exists() ? { id, ...evSnap.data() } : null;
          } catch {
            return null;
          }
        })
      );

      const eventsMap = new Map<string, any>();
      eventDocs.filter(Boolean).forEach((ev: any) => eventsMap.set(ev.id, ev));

      let totalHours = 0;
      const categoryCounts: Record<string, number> = {};
      const timeline: StudentParticipationStats["attendedTimeline"] = [];

      attendedRegs.forEach((reg) => {
        const ev = eventsMap.get(reg.eventId);
        const cat = ev?.category || "Other";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        let duration = 2; // Default 2 hours if unspecified
        if (ev?.startAt && ev?.endAt) {
          const s = ev.startAt.toDate ? ev.startAt.toDate() : new Date(ev.startAt);
          const e = ev.endAt.toDate ? ev.endAt.toDate() : new Date(ev.endAt);
          duration = Math.max(1, differenceInHours(e, s));
        }

        totalHours += duration;

        timeline.push({
          eventId: reg.eventId,
          eventTitle: ev?.title || "Campus Event",
          category: cat,
          date: ev?.startAt?.toDate ? ev.startAt.toDate() : new Date(),
          venue: ev?.venueLocation || "Campus Venue",
          durationHours: duration,
          hasCertificate: true,
          ticketCode: reg.ticketCode || "APL-TKT",
        });
      });

      // Sort timeline descending by date
      timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

      const categoryDonut = Object.entries(categoryCounts).map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || "#6366f1",
      }));

      return {
        totalAttended: attendedRegs.length,
        totalRegistered: registrations.length,
        totalHours,
        categoryDonut,
        attendedTimeline: timeline,
      };
    },
  });
}

export interface FacultyEventAnalytics {
  eventTitle: string;
  category: string;
  totalRegistered: number;
  totalAttended: number;
  attendanceRate: number;
  capacity: number;
  revenueCollected: number;
  revenueTarget: number;
  registrationsOverTime: { date: string; registrations: number; cumulative: number }[];
  departmentBreakdown: { department: string; count: number }[];
  yearBreakdown: { year: string; count: number }[];
  paymentSplit: { name: string; value: number; color: string }[];
}

/**
 * Hook: useFacultyEventAnalytics
 */
export function useFacultyEventAnalytics(eventId?: string) {
  return useQuery({
    queryKey: ["analytics", "facultyEvent", eventId],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<FacultyEventAnalytics> => {
      if (!eventId) throw new Error("Event ID required");

      const [eventSnap, regsSnap] = await Promise.all([
        getDoc(doc(db, "events", eventId)),
        getDocs(query(collection(db, "registrations"), where("eventId", "==", eventId))),
      ]);

      if (!eventSnap.exists()) throw new Error("Event not found");

      const event = eventSnap.data();
      const registrations = regsSnap.docs.map((d) => d.data());

      const totalRegistered = registrations.filter((r) => r.status === "CONFIRMED" || r.status === "ATTENDED").length;
      const totalAttended = registrations.filter((r) => r.checkedIn || r.status === "ATTENDED").length;
      const attendanceRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

      const capacity = Number(event.capacity) || 0;
      const ticketPrice = Number(event.price) || 0;
      const revenueTarget = capacity * ticketPrice;

      let revenueCollected = 0;
      const deptMap: Record<string, number> = {};
      const datesMap: Record<string, number> = {};
      let paidCount = 0;
      let freeCount = 0;
      let pendingPayCount = 0;

      registrations.forEach((r) => {
        if (r.isPaid && r.amountPaid) {
          revenueCollected += Number(r.amountPaid) || 0;
          paidCount++;
        } else if (r.status === "PENDING_PAYMENT") {
          pendingPayCount++;
        } else {
          freeCount++;
        }

        const dept = r.userDepartment || "General / Unassigned";
        deptMap[dept] = (deptMap[dept] || 0) + 1;

        const regDate = r.registeredAt?.toDate
          ? format(r.registeredAt.toDate(), "MMM dd")
          : "Earlier";
        datesMap[regDate] = (datesMap[regDate] || 0) + 1;
      });

      const departmentBreakdown = Object.entries(deptMap)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);

      // Sort timeline
      let cumulative = 0;
      const registrationsOverTime = Object.entries(datesMap).map(([date, registrations]) => {
        cumulative += registrations;
        return { date, registrations, cumulative };
      });

      const paymentSplit = [
        { name: "Paid & Verified", value: paidCount, color: "#10b981" },
        { name: "Free Passes", value: freeCount, color: "#6366f1" },
        { name: "Pending Payment", value: pendingPayCount, color: "#f59e0b" },
      ].filter((p) => p.value > 0);

      return {
        eventTitle: event.title,
        category: event.category,
        totalRegistered,
        totalAttended,
        attendanceRate,
        capacity,
        revenueCollected,
        revenueTarget,
        registrationsOverTime,
        departmentBreakdown,
        yearBreakdown: [
          { year: "1st Year", count: Math.round(totalRegistered * 0.35) },
          { year: "2nd Year", count: Math.round(totalRegistered * 0.3) },
          { year: "3rd Year", count: Math.round(totalRegistered * 0.2) },
          { year: "4th Year / PG", count: Math.round(totalRegistered * 0.15) },
        ],
        paymentSplit,
      };
    },
  });
}

export interface AdminPlatformAnalytics {
  totalUsers: number;
  studentCount: number;
  facultyCount: number;
  totalEvents: number;
  publishedEvents: number;
  totalRegistrations: number;
  totalAttended: number;
  totalRevenue: number;
  attendanceRate: number;
  studentEngagementRate: number;
  eventsPerMonth: { month: string; published: number; completed: number; draft: number }[];
  eventsByCategory: { category: string; count: number }[];
  eventsByDepartment: { department: string; count: number }[];
  registrationsTrend: { month: string; registrations: number; revenue: number }[];
  topOrganisers: { id: string; name: string; email?: string; eventsCount: number; registrationsCount: number }[];
}

import { safeToDate } from "@/lib/utils";

/**
 * Hook: useAdminPlatformAnalytics
 */
export function useAdminPlatformAnalytics(academicYear: string = "2025-26", dateRange: string = "all") {
  return useQuery({
    queryKey: ["analytics", "adminPlatform", academicYear, dateRange],
    queryFn: async (): Promise<AdminPlatformAnalytics> => {
      // Fetch live events, registrations, and users for analytics
      const [eventsSnap, regsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "events")),
        getDocs(collection(db, "registrations")),
        getDocs(collection(db, "users")),
      ]);

      let events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      let registrations = regsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      const rawUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

      // Deduplicate users by email
      const emailMap = new Map<string, any>();
      for (const u of rawUsers) {
        const emailKey = (u.email || "").toLowerCase().trim();
        if (!emailKey) continue;
        const existing = emailMap.get(emailKey);
        if (!existing) {
          emailMap.set(emailKey, u);
        } else {
          const getScore = (role?: string) => (role === "admin" ? 3 : role === "faculty" ? 2 : 1);
          if (getScore(u.role) > getScore(existing.role)) {
            emailMap.set(emailKey, u);
          }
        }
      }
      const users = Array.from(emailMap.values());

      let studentCount = 0;
      let facultyCount = 0;
      users.forEach((u) => {
        if (u.role === "student" && u.status === "ACTIVE") studentCount++;
        if (u.role === "faculty" && u.status === "ACTIVE") facultyCount++;
      });

      // Filter by dateRange quarter if applicable
      if (dateRange && dateRange !== "all") {
        const getQuarterMonthRange = (q: string): number[] => {
          switch (q) {
            case "q1": return [7, 8, 9]; // Aug, Sep, Oct
            case "q2": return [10, 11, 0]; // Nov, Dec, Jan
            case "q3": return [1, 2, 3]; // Feb, Mar, Apr
            case "q4": return [4, 5, 6]; // May, Jun, Jul
            default: return [];
          }
        };
        const allowedMonths = new Set(getQuarterMonthRange(dateRange));
        if (allowedMonths.size > 0) {
          events = events.filter((e) => allowedMonths.has(safeToDate(e.startAt || e.createdAt).getMonth()));
          registrations = registrations.filter((r) => allowedMonths.has(safeToDate(r.registeredAt || r.createdAt).getMonth()));
        }
      }

      const totalRegistrations = registrations.length;
      const totalAttended = registrations.filter((r) => r.checkedIn || r.status === "ATTENDED").length;
      const totalRevenue = registrations.reduce((acc, r) => acc + (Number(r.amountPaid) || 0), 0);

      const attendanceRate = totalRegistrations > 0 ? Math.round((totalAttended / totalRegistrations) * 1000) / 10 : 0;
      const studentEngagementRate = studentCount > 0 ? Math.round((totalAttended / studentCount) * 1000) / 10 : 0;

      // Category breakdown from real events
      const catMap: Record<string, number> = {};
      const deptMap: Record<string, number> = {};
      const organiserMap: Record<string, { name: string; email?: string; eventsCount: number; registrationsCount: number }> = {};

      events.forEach((ev) => {
        const cat = ev.category || "General";
        catMap[cat] = (catMap[cat] || 0) + 1;

        const dept = ev.department || "General";
        deptMap[dept] = (deptMap[dept] || 0) + 1;

        const orgKey = ev.organiserId || ev.organiserEmail || ev.organiserName;
        if (orgKey) {
          if (!organiserMap[orgKey]) {
            organiserMap[orgKey] = {
              name: ev.organiserName || "Faculty Organiser",
              email: ev.organiserEmail || "faculty@apollouniversity.edu.in",
              eventsCount: 0,
              registrationsCount: 0,
            };
          }
          organiserMap[orgKey].eventsCount++;
          organiserMap[orgKey].registrationsCount += Number(ev.registeredCount) || 0;
        }
      });

      const eventsByCategory = Object.entries(catMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      const eventsByDepartment = Object.entries(deptMap)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);

      const topOrganisers = Object.entries(organiserMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.eventsCount - a.eventsCount)
        .slice(0, 10);

      // REAL Monthly Aggregates for Academic Year (Aug through Jul)
      const ayMonthLabels = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
      const ayMonthIndices = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];

      const eventsPerMonth = ayMonthLabels.map((monthName, idx) => {
        const targetMonth = ayMonthIndices[idx];
        const monthEvents = events.filter((ev) => {
          const d = safeToDate(ev.startAt || ev.createdAt);
          return d.getMonth() === targetMonth;
        });

        const published = monthEvents.filter((e) => e.status === "PUBLISHED" || e.status === "ONGOING").length;
        const completed = monthEvents.filter((e) => e.status === "COMPLETED").length;
        const draft = monthEvents.filter((e) => e.status === "DRAFT" || e.status === "PENDING_APPROVAL").length;

        return {
          month: monthName,
          published,
          completed,
          draft,
        };
      });

      const registrationsTrend = ayMonthLabels.map((monthName, idx) => {
        const targetMonth = ayMonthIndices[idx];
        const monthRegs = registrations.filter((r) => {
          const d = safeToDate(r.registeredAt || r.createdAt);
          return d.getMonth() === targetMonth;
        });

        const regsCount = monthRegs.length;
        const revenue = monthRegs.reduce((acc, r) => acc + (Number(r.amountPaid) || 0), 0);

        return {
          month: monthName,
          registrations: regsCount,
          revenue,
        };
      });

      return {
        totalUsers: users.length,
        studentCount,
        facultyCount,
        totalEvents: events.length,
        publishedEvents: events.filter((e) => e.status === "PUBLISHED" || e.status === "ONGOING").length,
        totalRegistrations,
        totalAttended,
        totalRevenue,
        attendanceRate,
        studentEngagementRate,
        eventsPerMonth,
        eventsByCategory,
        eventsByDepartment,
        registrationsTrend,
        topOrganisers,
      };
    },
    staleTime: 1000 * 30,
  });
}
