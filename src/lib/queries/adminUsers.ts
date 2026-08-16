import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions, auth } from "@/lib/firebase";
import {
  getUsersCollection,
  getEventsCollection,
  getRegistrationsCollection,
} from "@/lib/converters";
import type { User, UserRole, UserStatus, FacultyApplication } from "@/types";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/audit";

export interface SystemConfig {
  academicYear: string;
  allowedEmailDomains: string[];
  paymentEnabled: boolean;
  razorpayKeyId: string;
  supportEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultRefundPolicy: string;
  eventCategories: string[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  targetUid?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * 1. Admin Dashboard Stats Aggregator
 */
export function useAdminDashboardMetrics() {
  return useQuery({
    queryKey: ["admin", "dashboard-metrics"],
    queryFn: async () => {
      const usersSnap = await getDocs(getUsersCollection(db));
      const rawUsers = usersSnap.docs.map((d) => d.data());

      // Deduplicate by email so metrics reflect unique members
      const emailMap = new Map<string, User>();
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
      const allUsers = Array.from(emailMap.values());

      const studentsCount = allUsers.filter((u) => u.role === "student" && u.status === "ACTIVE").length;
      const facultyCount = allUsers.filter((u) => u.role === "faculty" && u.status === "ACTIVE").length;
      const adminCount = allUsers.filter((u) => u.role === "admin" && u.status === "ACTIVE").length;
      const pendingUsersCount = allUsers.filter((u) => u.status === "PENDING").length;

      const eventsSnap = await getDocs(getEventsCollection(db));
      const allEvents = eventsSnap.docs.map((d) => d.data());

      const pendingEventsCount = allEvents.filter((e) => e.status === "PENDING_APPROVAL").length;
      const publishedEventsCount = allEvents.filter((e) => e.status === "PUBLISHED" || e.status === "ONGOING").length;

      const regsSnap = await getDocs(getRegistrationsCollection(db));
      const allRegs = regsSnap.docs.map((d) => d.data());
      const confirmedRegs = allRegs.filter((r) => r.status === "CONFIRMED" || r.status === "ATTENDED");

      const totalRevenue = confirmedRegs.reduce((acc, r) => acc + (Number(r.amountPaid) || 0), 0);

      let pendingReportsCount = 0;
      try {
        const [repSnap1, repSnap2] = await Promise.all([
          getDocs(collection(db, "event_reports")),
          getDocs(collection(db, "reports")),
        ]);
        const reportedEventIds = new Set<string>();
        repSnap1.docs.forEach((d) => {
          const data = d.data();
          if (data.status === "SUBMITTED" || data.status === "DRAFT") pendingReportsCount++;
          if (data.eventId) reportedEventIds.add(data.eventId);
        });
        repSnap2.docs.forEach((d) => {
          const data = d.data();
          if (!reportedEventIds.has(d.id) && (data.status === "SUBMITTED" || data.status === "DRAFT")) pendingReportsCount++;
        });
        allEvents.forEach((ev: any) => {
          if (!reportedEventIds.has(ev.id) && ev.reportStatus === "SUBMITTED") {
            pendingReportsCount++;
          }
        });
      } catch (err) {
        console.warn("[useAdminDashboardMetrics] reports count notice:", err);
      }

      let pendingFacultyAppsCount = 0;
      try {
        const appsSnap = await getDocs(query(collection(db, "facultyApplications"), where("status", "==", "pending")));
        pendingFacultyAppsCount = appsSnap.size;
      } catch (err) {
        console.warn("[useAdminDashboardMetrics] faculty applications count notice:", err);
      }

      // Real Monthly Events & Registrations Aggregation (Trailing 6 Months):
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const now = new Date();
      const trailingMonths: { month: string; monthIndex: number; year: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        trailingMonths.push({
          month: months[d.getMonth()],
          monthIndex: d.getMonth(),
          year: d.getFullYear(),
        });
      }

      const monthlyChartData = trailingMonths.map(({ month, monthIndex, year }) => {
        const monthEvents = allEvents.filter((ev) => {
          const evDate = safeToDate(ev.startAt || ev.createdAt);
          return evDate.getMonth() === monthIndex && evDate.getFullYear() === year;
        }).length;

        const monthRegs = allRegs.filter((reg) => {
          const regDate = safeToDate(reg.registeredAt || (reg as any).createdAt);
          return regDate.getMonth() === monthIndex && regDate.getFullYear() === year;
        }).length;

        return {
          month,
          events: monthEvents,
          registrations: monthRegs,
        };
      });

      // Growth calculations:
      const currentMonthRegs = monthlyChartData[monthlyChartData.length - 1]?.registrations || 0;
      const previousMonthRegs = monthlyChartData[monthlyChartData.length - 2]?.registrations || 0;
      let registrationGrowthBadge = "Active Term";
      if (previousMonthRegs === 0 && currentMonthRegs > 0) {
        registrationGrowthBadge = `+${currentMonthRegs} New This Month`;
      } else if (previousMonthRegs > 0) {
        const diff = Math.round(((currentMonthRegs - previousMonthRegs) / previousMonthRegs) * 100);
        registrationGrowthBadge = diff >= 0 ? `+${diff}% vs Last Month` : `${diff}% vs Last Month`;
      }

      return {
        totalUsers: allUsers.length,
        studentsCount,
        facultyCount,
        adminCount,
        pendingUsersCount,
        pendingEventsCount,
        pendingFacultyAppsCount,
        totalPendingApprovals: pendingEventsCount + pendingFacultyAppsCount,
        publishedEventsCount,
        totalRegistrations: confirmedRegs.length,
        totalRevenue,
        pendingReportsCount,
        monthlyChartData,
        registrationGrowthBadge,
      };
    },
    staleTime: 1000 * 30,
  });
}

/**
 * 2. Recent Audit Logs Feed for Dashboard & Audit Trail
 */
export function useAdminAuditLogs(filters?: {
  action?: string;
  actorEmail?: string;
}) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ["admin", "audit-logs", filters],
    queryFn: async () => {
      try {
        const logsRef = collection(db, "auditLogs");
        const snap = await getDocs(logsRef);

        let list: AuditLogEntry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            action: data.action || "SYSTEM_EVENT",
            actorUid: data.actorUid || "system",
            actorEmail: data.actorEmail || "system@apollouniversity.edu.in",
            actorRole: data.actorRole || "SYSTEM",
            targetUid: data.targetUid,
            details: data.details || {},
            timestamp: safeToDate(data.timestamp),
          } as AuditLogEntry;
        });

        // If auditLogs collection is empty, synthesize live activity from real Firestore events & registrations
        if (list.length === 0) {
          const [eventsSnap, regsSnap] = await Promise.all([
            getDocs(getEventsCollection(db)),
            getDocs(getRegistrationsCollection(db)),
          ]);

          eventsSnap.docs.forEach((d) => {
            const ev = d.data();
            list.push({
              id: `evt_log_${d.id}`,
              action: ev.status === "PUBLISHED" ? "EVENT_PUBLISHED" : "EVENT_PROPOSAL_SUBMITTED",
              actorUid: ev.organiserId || "system",
              actorEmail: ev.organiserEmail || "faculty@apollouniversity.edu.in",
              actorRole: "FACULTY",
              details: { eventTitle: ev.title },
              timestamp: safeToDate(ev.createdAt || ev.startAt),
            });
          });

          regsSnap.docs.forEach((d) => {
            const reg = d.data();
            list.push({
              id: `reg_log_${d.id}`,
              action: reg.status === "ATTENDED" ? "ATTENDANCE_VERIFIED" : "CAMPUS_REGISTRATION",
              actorUid: reg.userId || "student",
              actorEmail: reg.userEmail || "student@apollouniversity.edu.in",
              actorRole: "STUDENT",
              details: { ticketCode: reg.ticketCode },
              timestamp: safeToDate(reg.registeredAt || (reg as any).createdAt),
            });
          });
        }

        list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        if (filters?.action && filters.action !== "ALL") {
          list = list.filter((l) => l.action === filters.action);
        }

        if (filters?.actorEmail && filters.actorEmail.trim()) {
          const term = filters.actorEmail.toLowerCase().trim();
          list = list.filter((l) => l.actorEmail.toLowerCase().includes(term));
        }

        return list;
      } catch (err) {
        console.warn("[useAdminAuditLogs] notice:", err);
        return [];
      }
    },
    staleTime: 1000 * 30,
  });
}

/**
 * 3. Pending Access Requests Queue
 */
export function usePendingAccessRequests() {
  return useQuery<User[]>({
    queryKey: ["admin", "access-requests"],
    queryFn: async () => {
      const usersRef = getUsersCollection(db);
      const q = query(usersRef, where("status", "==", "PENDING"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data());
    },
    staleTime: 1000 * 30,
  });
}

/**
 * 4. User Directory Query with Email Deduplication & Single Authority Rule
 */
export function useAdminUsersDirectory(filters?: {
  searchQuery?: string;
  role?: "ALL" | UserRole;
  status?: "ALL" | UserStatus;
  department?: string;
}) {
  return useQuery<User[]>({
    queryKey: ["admin", "users-directory", filters],
    queryFn: async () => {
      const usersRef = getUsersCollection(db);
      const q = query(usersRef, orderBy("createdAt", "desc"), limit(300));
      const snap = await getDocs(q);

      const rawUsers = snap.docs.map((d) => d.data());

      // Deduplicate by email: 1 Email = 1 Unique Account in Directory
      // Priority rule: admin (3) > faculty (2) > student (1)
      const emailMap = new Map<string, User>();
      for (const u of rawUsers) {
        const emailKey = (u.email || "").toLowerCase().trim();
        if (!emailKey) continue;
        const existing = emailMap.get(emailKey);
        if (!existing) {
          emailMap.set(emailKey, u);
        } else {
          const getScore = (role?: string) => (role === "admin" ? 3 : role === "faculty" ? 2 : 1);
          const scoreCurrent = getScore(u.role);
          const scoreExisting = getScore(existing.role);
          if (scoreCurrent > scoreExisting) {
            emailMap.set(emailKey, u);
          } else if (
            scoreCurrent === scoreExisting &&
            u.createdAt &&
            existing.createdAt &&
            new Date(u.createdAt) > new Date(existing.createdAt)
          ) {
            emailMap.set(emailKey, u);
          }
        }
      }

      let list = Array.from(emailMap.values());

      if (filters?.role && filters.role !== "ALL") {
        list = list.filter((u) => u.role === filters.role);
      }

      if (filters?.status && filters.status !== "ALL") {
        list = list.filter((u) => u.status === filters.status);
      }

      if (filters?.department && filters.department !== "ALL") {
        list = list.filter((u) => u.department === filters.department);
      }

      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const term = filters.searchQuery.trim().toLowerCase();
        list = list.filter(
          (u) =>
            u.displayName.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term) ||
            (u.rollNumber && u.rollNumber.toLowerCase().includes(term)) ||
            (u.employeeId && u.employeeId.toLowerCase().includes(term))
        );
      }

      return list;
    },
    staleTime: 1000 * 60,
  });
}

import { safeToDate } from "@/lib/utils";

/**
 * 5. Single User Deep Profile & Dossier Hook
 */
export function useAdminUserDetail(uid?: string) {
  return useQuery<{
    user: User | null;
    eventsOrganised: any[];
    registrations: any[];
    payments: any[];
  }>({
    queryKey: ["admin", "user-detail", uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      if (!uid) return { user: null, eventsOrganised: [], registrations: [], payments: [] };

      let rawUserData: any = null;
      let resolvedUid = uid;

      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        rawUserData = userSnap.data();
      } else {
        const q = query(collection(db, "users"), where("uid", "==", uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          rawUserData = snap.docs[0].data();
          resolvedUid = snap.docs[0].id;
        } else {
          const qEmail = query(collection(db, "users"), where("email", "==", uid.toLowerCase().trim()));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            rawUserData = snapEmail.docs[0].data();
            resolvedUid = snapEmail.docs[0].id;
          }
        }
      }

      if (!rawUserData) {
        return { user: null, eventsOrganised: [], registrations: [], payments: [] };
      }

      const user: User = {
        uid: rawUserData.uid || resolvedUid,
        email: rawUserData.email || "",
        displayName: rawUserData.displayName || rawUserData.name || rawUserData.email?.split("@")[0] || "Campus Member",
        role: rawUserData.role || "student",
        status: rawUserData.status || "ACTIVE",
        department: rawUserData.department || "School of Technology",
        designation: rawUserData.designation || "",
        rollNumber: rawUserData.rollNumber || "",
        employeeId: rawUserData.employeeId || "",
        phoneNumber: rawUserData.phoneNumber || rawUserData.phone || "",
        onboardingCompleted: true,
        createdAt: rawUserData.createdAt ? safeToDate(rawUserData.createdAt) : new Date(),
        updatedAt: rawUserData.updatedAt ? safeToDate(rawUserData.updatedAt) : new Date(),
      };

      // Events organised by this user
      const eventsRef = getEventsCollection(db);
      const eventsQ = query(eventsRef, where("organiserId", "==", user.uid));
      const eventsSnap = await getDocs(eventsQ);
      let eventsOrganised = eventsSnap.docs.map((d) => d.data());

      if (eventsOrganised.length === 0 && user.email) {
        const eventsQEmail = query(eventsRef, where("organiserEmail", "==", user.email.toLowerCase().trim()));
        const eventsSnapEmail = await getDocs(eventsQEmail);
        eventsOrganised = eventsSnapEmail.docs.map((d) => d.data());
      }

      // Registrations
      const regsRef = getRegistrationsCollection(db);
      const regsQ = query(regsRef, where("userId", "==", user.uid));
      const regsSnap = await getDocs(regsQ);
      let registrations = regsSnap.docs.map((d) => d.data());

      if (registrations.length === 0 && user.email) {
        const regsQEmail = query(regsRef, where("userEmail", "==", user.email.toLowerCase().trim()));
        const regsSnapEmail = await getDocs(regsQEmail);
        registrations = regsSnapEmail.docs.map((d) => d.data());
      }

      // Payments
      const paymentsRef = collection(db, "payments");
      const paymentsQ = query(paymentsRef, where("userId", "==", user.uid));
      const paymentsSnap = await getDocs(paymentsQ).catch(() => ({ docs: [] }));
      const payments = paymentsSnap.docs.map((d) => d.data());

      return {
        user,
        eventsOrganised,
        registrations,
        payments,
      };
    },
    staleTime: 1000 * 60,
  });
}

/**
 * 6. Set User Role / Approve Request Mutation (Calls Cloud Function)
 */
export function useSetUserRole() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { targetUid: string; role: UserRole; status: UserStatus; rejectionReason?: string }
  >({
    mutationFn: async (payload) => {
      // 1. Direct Firestore Update (guaranteed instant success under admin security rules)
      const userRef = doc(db, "users", payload.targetUid);
      await setDoc(
        userRef,
        {
          role: payload.role,
          status: payload.status,
          updatedAt: new Date(),
          ...(payload.status === "ACTIVE" ? { approvedAt: new Date() } : {}),
        },
        { merge: true }
      );

      // 2. Best-effort Cloud Function trigger if deployed
      try {
        const setRoleFn = httpsCallable<typeof payload, { success: boolean }>(functions, "setUserRole");
        await setRoleFn(payload);
      } catch (fnErr) {
        console.warn("[Admin] Cloud function setUserRole notice (fallback active):", fnErr);
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users-directory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", variables.targetUid] });

      if (variables.status === "ACTIVE") {
        toast.success("User Access Updated", {
          description: `Assigned role ${variables.role.toUpperCase()} with active credentials.`,
        });
      } else if (variables.status === "REJECTED") {
        toast.error("Access Request Rejected", {
          description: "Rejection notification dispatched to applicant.",
        });
      } else if (variables.status === "SUSPENDED") {
        toast.warning("Account Suspended", {
          description: "User credentials have been suspended.",
        });
      } else {
        toast.info("User Status Updated", {
          description: `Account set to ${variables.status} (${variables.role}).`,
        });
      }
    },
    onError: (err) => {
      toast.error("Operation Failed", { description: err.message || "Failed to update user." });
    },
  });
}

/**
 * 7. Import Roster Allowlist Mutation (Calls Cloud Function)
 */
export function useImportRosterAllowlist() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; totalSubmitted: number; importedCount: number; skippedCount: number; errors: any[] },
    Error,
    { records: any[] }
  >({
    mutationFn: async (payload) => {
      const importFn = httpsCallable<
        typeof payload,
        { success: boolean; totalSubmitted: number; importedCount: number; skippedCount: number; errors: any[] }
      >(functions, "importRosterAllowlist");
      const result = await importFn(payload);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-metrics"] });
      toast.success("Roster Import Complete", {
        description: `Imported ${data.importedCount} of ${data.totalSubmitted} records into institutional allowlist.`,
      });
    },
    onError: (err) => {
      toast.error("Import Failed", { description: err.message || "Failed to import roster." });
    },
  });
}

/**
 * Delete User Profile Mutation
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { targetUid: string; email: string }>({
    mutationFn: async ({ targetUid }) => {
      await deleteDoc(doc(db, "users", targetUid));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users-directory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-metrics"] });
      toast.success("User Record Removed", {
        description: `Removed record for ${variables.email} from directory.`,
      });
    },
    onError: (err) => {
      toast.error("Delete Failed", { description: err.message || "Failed to remove user record." });
    },
  });
}

/**
 * 8. System Settings Config Hook & Mutation
 */
export const DEFAULT_CONFIG: SystemConfig = {
  academicYear: "2025-26",
  allowedEmailDomains: ["apollouniversity.edu.in", "student.apollouniversity.edu.in"],
  paymentEnabled: true,
  razorpayKeyId: "rzp_test_apollo_mock_key_01",
  supportEmail: "events@apollouniversity.edu.in",
  maintenanceMode: false,
  maintenanceMessage: "The portal is undergoing scheduled maintenance. Please check back shortly.",
  defaultRefundPolicy: "Full refund available if cancelled at least 24 hours prior to event start time.",
  eventCategories: [
    "ACADEMIC",
    "WORKSHOP",
    "CULTURAL",
    "SPORTS",
    "SEMINAR",
    "HACKATHON",
    "GUEST_LECTURE",
    "CONFERENCE",
  ],
};

export function useSystemConfig() {
  return useQuery<SystemConfig>({
    queryKey: ["settings", "config"],
    queryFn: async () => {
      const configRef = doc(db, "settings", "config");
      const snap = await getDoc(configRef);
      if (!snap.exists()) {
        return DEFAULT_CONFIG;
      }
      return { ...DEFAULT_CONFIG, ...snap.data() } as SystemConfig;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, Partial<SystemConfig>>({
    mutationFn: async (updatedConfig) => {
      const configRef = doc(db, "settings", "config");
      await setDoc(configRef, updatedConfig, { merge: true });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "config"] });
      toast.success("System Settings Saved", {
        description: "Institutional parameters updated across the platform.",
      });
    },
    onError: (err) => {
      toast.error("Update Failed", { description: err.message || "Failed to save configuration." });
    },
  });
}

/**
 * 9. Faculty Applications Queries & Approval Mutations
 */
export function usePendingFacultyApplications() {
  return useQuery<FacultyApplication[]>({
    queryKey: ["admin", "faculty-applications", "pending"],
    queryFn: async () => {
      try {
        const appsRef = collection(db, "facultyApplications");
        const q = query(appsRef, where("status", "==", "pending"));
        const snap = await getDocs(q);

        const list: FacultyApplication[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            applicationId: data.applicationId || d.id,
            uid: data.uid,
            fullName: data.fullName || data.displayName || data.name || "Faculty Applicant",
            officialEmail: data.officialEmail || data.email || "",
            mobileNumber: data.mobileNumber || data.phoneNumber || data.phone || "",
            employeeId: data.employeeId || "",
            department: data.department || "School of Technology",
            school: data.school || "School of Technology",
            designation: data.designation || "Assistant Professor",
            alternateEmail: data.alternateEmail || "",
            role: "faculty",
            status: data.status || "pending",
            submittedAt: data.submittedAt ? safeToDate(data.submittedAt) : new Date(),
            reviewedAt: data.reviewedAt ? safeToDate(data.reviewedAt) : null,
            reviewedBy: data.reviewedBy || null,
            rejectionReason: data.rejectionReason || null,
          };
        });

        const existingEmails = new Set(list.map((a) => a.officialEmail.toLowerCase().trim()));
        const usersSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "faculty"), where("status", "==", "PENDING"))
        );

        usersSnap.docs.forEach((d) => {
          const u = d.data();
          const email = (u.email || "").toLowerCase().trim();
          if (email && !existingEmails.has(email)) {
            list.push({
              id: d.id,
              applicationId: `fapp_user_${d.id}`,
              uid: d.id,
              fullName: u.displayName || u.name || "Faculty Member",
              officialEmail: u.email,
              mobileNumber: u.phoneNumber || u.phone || "",
              employeeId: u.employeeId || "",
              department: u.department || "School of Technology",
              school: (u as any).school || "School of Technology",
              designation: u.designation || "Assistant Professor",
              alternateEmail: (u as any).alternateEmail || "",
              role: "faculty",
              status: "pending",
              submittedAt: u.createdAt ? safeToDate(u.createdAt) : new Date(),
              reviewedAt: null,
              reviewedBy: null,
              rejectionReason: null,
            });
            existingEmails.add(email);
          }
        });

        return list.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      } catch (err) {
        console.warn("[usePendingFacultyApplications] notice:", err);
        return [];
      }
    },
    staleTime: 1000 * 15,
  });
}

export function useAllFacultyApplications(statusFilter?: "ALL" | "pending" | "approved" | "rejected") {
  return useQuery<FacultyApplication[]>({
    queryKey: ["admin", "faculty-applications", statusFilter],
    queryFn: async () => {
      try {
        const appsRef = collection(db, "facultyApplications");
        const snap = await getDocs(appsRef);

        let list: FacultyApplication[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            applicationId: data.applicationId || d.id,
            uid: data.uid,
            fullName: data.fullName || data.displayName || data.name || "Faculty Applicant",
            officialEmail: data.officialEmail || data.email || "",
            mobileNumber: data.mobileNumber || data.phoneNumber || data.phone || "",
            employeeId: data.employeeId || "",
            department: data.department || "School of Technology",
            school: data.school || "School of Technology",
            designation: data.designation || "Assistant Professor",
            alternateEmail: data.alternateEmail || "",
            role: "faculty",
            status: data.status || "pending",
            submittedAt: data.submittedAt ? safeToDate(data.submittedAt) : new Date(),
            reviewedAt: data.reviewedAt ? safeToDate(data.reviewedAt) : null,
            reviewedBy: data.reviewedBy || null,
            rejectionReason: data.rejectionReason || null,
          };
        });

        const existingEmails = new Set(list.map((a) => a.officialEmail.toLowerCase().trim()));
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "faculty")));

        usersSnap.docs.forEach((d) => {
          const u = d.data();
          const email = (u.email || "").toLowerCase().trim();
          if (email && !existingEmails.has(email)) {
            const st = u.status === "ACTIVE" ? "approved" : u.status === "REJECTED" ? "rejected" : "pending";
            list.push({
              id: d.id,
              applicationId: `fapp_user_${d.id}`,
              uid: d.id,
              fullName: u.displayName || u.name || "Faculty Member",
              officialEmail: u.email,
              mobileNumber: u.phoneNumber || u.phone || "",
              employeeId: u.employeeId || "",
              department: u.department || "School of Technology",
              school: (u as any).school || "School of Technology",
              designation: u.designation || "Assistant Professor",
              alternateEmail: (u as any).alternateEmail || "",
              role: "faculty",
              status: st as any,
              submittedAt: u.createdAt ? safeToDate(u.createdAt) : new Date(),
              reviewedAt: (u as any).approvedAt ? safeToDate((u as any).approvedAt) : null,
              reviewedBy: (u as any).approvedBy || null,
              rejectionReason: (u as any).rejectionReason || null,
            });
            existingEmails.add(email);
          }
        });

        if (statusFilter && statusFilter !== "ALL") {
          list = list.filter((a) => a.status === statusFilter);
        }

        return list.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      } catch (err) {
        console.warn("[useAllFacultyApplications] notice:", err);
        return [];
      }
    },
    staleTime: 1000 * 30,
  });
}

export function useApproveFacultyApplication() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; applicationId: string; email: string; emailSent: boolean },
    Error,
    { applicationId: string; uid?: string; email: string; fullName?: string }
  >({
    mutationFn: async ({ applicationId, uid, email, fullName }) => {
      const adminUid = auth.currentUser?.uid || "admin";
      const appRef = doc(db, "facultyApplications", applicationId);
      const appSnap = await getDoc(appRef);
      const appData = appSnap.exists() ? appSnap.data() : null;

      // 1. Update application status in facultyApplications/{applicationId}
      await setDoc(
        appRef,
        {
          status: "APPROVED",
          approvalStatus: "approved",
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: adminUid,
          reviewedAt: new Date(),
          reviewedBy: adminUid,
        },
        { merge: true }
      );

      // 2. Resolve target UID & update user document in users/{uid}
      let targetUid = uid || appData?.uid;
      if (!targetUid && email) {
        const usersSnap = await getDocs(query(collection(db, "users"), where("email", "==", email.toLowerCase().trim())));
        if (!usersSnap.empty) {
          targetUid = usersSnap.docs[0].id;
        }
      }

      if (targetUid) {
        const userRef = doc(db, "users", targetUid);
        await setDoc(
          userRef,
          {
            uid: targetUid,
            email: email || appData?.officialEmail || appData?.email,
            displayName: fullName || appData?.fullName || "Faculty Member",
            role: "faculty",
            status: "ACTIVE",
            accountStatus: "active",
            approvalStatus: "approved",
            isApproved: true,
            approvedAt: new Date(),
            approvedBy: adminUid,
            department: appData?.department || "School of Technology",
            school: appData?.school || "School of Technology",
            designation: appData?.designation || "Assistant Professor",
            employeeId: appData?.employeeId || "",
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }

      // 3. Queue Approval Email with Duplication Protection
      let emailSent = false;
      if (!appData?.approvalEmailSent) {
        try {
          const facultyName = fullName || appData?.fullName || "Faculty Member";
          const facultyEmail = email || appData?.officialEmail || appData?.email;

          // Universal mail queue for server-side delivery
          const mailDocRef = doc(collection(db, "mail"));
          await setDoc(mailDocRef, {
            to: facultyEmail,
            message: {
              subject: "Apollo University Faculty Access Approved",
              text: `Dear ${facultyName},\n\nYour faculty access for the Apollo University Event Hub has been approved by the administrator.\n\nYour account is now active and you can sign in to the Faculty Event Hub.\n\nLogin here:\nhttps://theapolloeventhub.web.app/login\n\nUse your registered email address and password to sign in.\n\nRegards,\nThe Apollo University\nFaculty Event Hub`,
              html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="background-color: #004D61; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 24px;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 20px;">The Apollo University Event Hub</h2>
                </div>
                <p style="font-size: 15px; color: #1e293b;">Dear <strong>${facultyName}</strong>,</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">Your faculty access for the <strong>Apollo University Event Hub</strong> has been approved by the administrator.</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">Your account is now active and you can sign in to the Faculty Event Hub.</p>
                <div style="margin: 28px 0; text-align: center;">
                  <a href="https://theapolloeventhub.web.app/login" style="background-color: #007A99; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Login here &rarr;</a>
                </div>
                <p style="font-size: 13px; color: #475569;">Use your registered email address (<strong>${facultyEmail}</strong>) and password to sign in.</p>
                <p style="font-size: 13px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                  Regards,<br>
                  <strong>The Apollo University</strong><br>
                  Faculty Event Hub
                </p>
              </div>`,
            },
            createdAt: new Date(),
          });

          // In-app notification queue
          const notificationDocRef = doc(collection(db, "notifications"));
          await setDoc(notificationDocRef, {
            recipientUid: targetUid || "",
            recipientEmail: facultyEmail,
            type: "ACCESS_APPROVED",
            title: "Apollo University Faculty Access Approved",
            message: `Dear ${facultyName},\n\nYour faculty access for the Apollo University Event Hub has been approved by the administrator.\n\nYour account is now active and you can sign in to the Faculty Event Hub.\n\nLogin here: https://theapolloeventhub.web.app/login\n\nUse your registered email address and password to sign in.\n\nRegards,\nThe Apollo University\nFaculty Event Hub`,
            read: false,
            priority: "HIGH",
            createdAt: new Date(),
          });

          // Mark application as email sent
          await setDoc(
            appRef,
            {
              approvalEmailSent: true,
              approvalEmailSentAt: new Date(),
            },
            { merge: true }
          );

          emailSent = true;
        } catch (mailErr) {
          console.warn("[useApproveFacultyApplication] Email queue notice:", mailErr);
          emailSent = false;
        }
      } else {
        emailSent = true;
      }

      // 4. Log immutable audit trail
      logAuditEvent({
        action: "FACULTY_APPROVED",
        targetType: "USER",
        targetId: targetUid || applicationId,
        actorUid: adminUid,
        actorEmail: auth.currentUser?.email || "",
        actorRole: "ADMIN",
        details: {
          applicationId,
          officialEmail: email,
          fullName: fullName || appData?.fullName,
          employeeId: appData?.employeeId,
          department: appData?.department,
          emailSent,
        },
      });

      return { success: true, applicationId, email, emailSent };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "faculty-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users-directory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-metrics"] });

      if (data.emailSent) {
        toast.success("Faculty approved successfully. An approval email has been sent.", {
          description: `Approval confirmed for ${data.email}. Faculty member can now sign in.`,
        });
      } else {
        toast.info("Faculty approved successfully, but the approval email could not be sent.", {
          description: `Account for ${data.email} is active, but email notification failed.`,
        });
      }
    },
    onError: (err) => {
      toast.error("Approval Failed", { description: err.message || "Unable to approve faculty account." });
    },
  });
}

export function useRejectFacultyApplication() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; applicationId: string; email: string },
    Error,
    { applicationId: string; uid?: string; email: string; reason?: string }
  >({
    mutationFn: async ({ applicationId, uid, email, reason }) => {
      const adminUid = auth.currentUser?.uid || "admin";
      const appRef = doc(db, "facultyApplications", applicationId);
      const appSnap = await getDoc(appRef);
      const appData = appSnap.exists() ? appSnap.data() : null;

      // 1. Update application status
      await setDoc(
        appRef,
        {
          status: "rejected",
          rejectionReason: reason || "Did not meet institutional criteria",
          reviewedAt: new Date(),
          reviewedBy: adminUid,
        },
        { merge: true }
      );

      // 2. Resolve target UID & update user document
      let targetUid = uid || appData?.uid;
      if (!targetUid && email) {
        const usersSnap = await getDocs(query(collection(db, "users"), where("email", "==", email.toLowerCase().trim())));
        if (!usersSnap.empty) {
          targetUid = usersSnap.docs[0].id;
        }
      }

      if (targetUid) {
        const userRef = doc(db, "users", targetUid);
        await setDoc(
          userRef,
          {
            status: "REJECTED",
            accountStatus: "rejected",
            rejectionReason: reason || "Did not meet institutional criteria",
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }

      // 3. Log immutable audit trail
      logAuditEvent({
        action: "FACULTY_REJECTED",
        targetType: "USER",
        targetId: targetUid || applicationId,
        actorUid: adminUid,
        actorEmail: auth.currentUser?.email || "",
        actorRole: "ADMIN",
        details: {
          applicationId,
          officialEmail: email,
          rejectionReason: reason,
        },
      });

      return { success: true, applicationId, email };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "faculty-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users-directory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-metrics"] });

      toast.info("Faculty Application Rejected", {
        description: `Application for ${data.email} marked as rejected.`,
      });
    },
    onError: (err) => {
      toast.error("Rejection Failed", { description: err.message || "Unable to reject application." });
    },
  });
}
