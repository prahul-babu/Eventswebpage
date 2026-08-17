import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
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
import {
  logAuditEvent,
  AuditLogRecord,
  inferActionCategory,
  generateAuditDescription,
} from "@/lib/audit";

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

export type AuditLogEntry = AuditLogRecord;

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
 * 2. Recent Audit Logs Feed for Dashboard & Institutional Audit Trail
 */
export function useAdminAuditLogs(filters?: {
  action?: string;
  category?: string;
  actorEmail?: string;
  role?: string;
}) {
  return useQuery<AuditLogRecord[]>({
    queryKey: ["admin", "audit-logs", filters],
    queryFn: async () => {
      try {
        const recordsMap = new Map<string, AuditLogRecord>();

        // 1. Fetch from primary auditLogs collection
        try {
          const logsRef1 = collection(db, "auditLogs");
          const snap1 = await getDocs(logsRef1);
          snap1.docs.forEach((d) => {
            const data = d.data();
            const action = data.action || "SYSTEM_EVENT";
            const actorName = data.actorName || data.actorEmail?.split("@")[0] || "Campus User";
            const actorRole = (data.actorRole || "STUDENT").toUpperCase();
            const targetType = data.targetType || "SYSTEM";
            const targetId = data.targetId || data.targetUid || "";
            const targetName = data.targetName || data.details?.eventTitle || data.details?.targetName || "";

            const record: AuditLogRecord = {
              id: d.id,
              action,
              actionCategory: data.actionCategory || inferActionCategory(action),
              actorId: data.actorId || data.actorUid || "system",
              actorName,
              actorEmail: data.actorEmail || "system@apollouniversity.edu.in",
              actorRole,
              targetType,
              targetId,
              targetName,
              description:
                data.description ||
                generateAuditDescription({
                  action,
                  actorName,
                  actorRole,
                  targetName,
                  targetType,
                }),
              status: data.status || "SUCCESS",
              details: data.details || {},
              changedFields: data.changedFields || undefined,
              timestamp: safeToDate(data.timestamp || (data as any).createdAt),
              userAgent: data.userAgent,
              ipAddress: data.ipAddress,
            };
            recordsMap.set(d.id, record);
          });
        } catch (e) {
          console.warn("[useAdminAuditLogs] auditLogs collection check:", e);
        }

        // 2. Fetch from legacy audit_logs collection for complete historical audit records
        try {
          const logsRef2 = collection(db, "audit_logs");
          const snap2 = await getDocs(logsRef2);
          snap2.docs.forEach((d) => {
            if (!recordsMap.has(d.id)) {
              const data = d.data();
              const action = data.action || "SYSTEM_EVENT";
              const actorName = data.actorName || data.actorEmail?.split("@")[0] || "Campus User";
              const actorRole = (data.actorRole || "STUDENT").toUpperCase();
              const targetType = data.targetType || "SYSTEM";
              const targetId = data.targetId || data.targetUid || "";
              const targetName = data.targetName || data.details?.eventTitle || data.details?.targetName || "";

              const record: AuditLogRecord = {
                id: d.id,
                action,
                actionCategory: data.actionCategory || inferActionCategory(action),
                actorId: data.actorId || data.actorUid || "system",
                actorName,
                actorEmail: data.actorEmail || "system@apollouniversity.edu.in",
                actorRole,
                targetType,
                targetId,
                targetName,
                description:
                  data.description ||
                  generateAuditDescription({
                    action,
                    actorName,
                    actorRole,
                    targetName,
                    targetType,
                  }),
                status: data.status || "SUCCESS",
                details: data.details || {},
                changedFields: data.changedFields || undefined,
                timestamp: safeToDate(data.timestamp || (data as any).createdAt),
                userAgent: data.userAgent,
                ipAddress: data.ipAddress,
              };
              recordsMap.set(d.id, record);
            }
          });
        } catch (e) {
          console.warn("[useAdminAuditLogs] audit_logs collection check:", e);
        }

        let list = Array.from(recordsMap.values());
        list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply filters if provided
        if (filters?.action && filters.action !== "ALL") {
          list = list.filter((l) => l.action === filters.action);
        }

        if (filters?.category && filters.category !== "ALL") {
          list = list.filter((l) => l.actionCategory === filters.category);
        }

        if (filters?.role && filters.role !== "ALL") {
          const roleTerm = filters.role.toUpperCase();
          list = list.filter((l) => l.actorRole === roleTerm);
        }

        if (filters?.actorEmail && filters.actorEmail.trim()) {
          const term = filters.actorEmail.toLowerCase().trim();
          list = list.filter(
            (l) =>
              l.actorEmail.toLowerCase().includes(term) ||
              l.actorName.toLowerCase().includes(term) ||
              (l.targetName && l.targetName.toLowerCase().includes(term))
          );
        }

        return list;
      } catch (err) {
        console.warn("[useAdminAuditLogs] notice:", err);
        return [];
      }
    },
    staleTime: 1000 * 15,
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
        department: rawUserData.department || "B.Tech. Computer Science and Engineering",
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

      // 3. Log immutable audit trail
      logAuditEvent({
        action: "USER_ROLE_CHANGED",
        actionCategory: "USER_MANAGEMENT",
        actorId: auth.currentUser?.uid || "admin",
        actorName: auth.currentUser?.displayName || "Administrator",
        actorEmail: auth.currentUser?.email || "",
        actorRole: "ADMIN",
        targetType: "USER",
        targetId: payload.targetUid,
        description: `Admin updated user role to ${payload.role.toUpperCase()} and status to ${payload.status}.`,
        status: "SUCCESS",
        details: { newRole: payload.role, newStatus: payload.status, rejectionReason: payload.rejectionReason },
      });

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
        const snap = await getDocs(appsRef);

        const list: FacultyApplication[] = [];
        snap.docs.forEach((d) => {
          const data = d.data();
          const rawStatus = String(data.status || "PENDING").toUpperCase();
          const isPending =
            rawStatus === "PENDING" ||
            rawStatus === "PENDING_APPROVAL" ||
            data.status === "pending" ||
            data.status === "PENDING_APPROVAL";

          if (isPending) {
            list.push({
              id: d.id,
              applicationId: data.applicationId || d.id,
              uid: data.uid,
              fullName: data.fullName || data.displayName || data.name || "Faculty Applicant",
              officialEmail: data.officialEmail || data.email || "",
              mobileNumber: data.mobileNumber || data.phoneNumber || data.phone || data.mobile || "",
              employeeId: data.employeeId || "",
              department: data.department || "Department of Computer Science & Engineering",
              school: data.school || "School of Technology",
              designation: data.designation || "Assistant Professor",
              alternateEmail: data.alternateEmail || "",
              role: "faculty",
              status: "PENDING",
              approvalStatus: "pending",
              isApproved: false,
              approvalEmailSent: data.approvalEmailSent ?? false,
              approvalEmailSentAt: data.approvalEmailSentAt ? safeToDate(data.approvalEmailSentAt) : null,
              submittedAt: data.submittedAt ? safeToDate(data.submittedAt) : data.createdAt ? safeToDate(data.createdAt) : new Date(),
              reviewedAt: null,
              reviewedBy: null,
              approvedAt: null,
              approvedBy: null,
              rejectionReason: null,
            });
          }
        });

        return list.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      } catch (err) {
        console.warn("[usePendingFacultyApplications] notice:", err);
        return [];
      }
    },
    staleTime: 1000 * 10,
  });
}

export function useAllFacultyApplications(statusFilter?: "ALL" | "pending" | "approved" | "rejected" | "PENDING" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED") {
  return useQuery<FacultyApplication[]>({
    queryKey: ["admin", "faculty-applications", statusFilter],
    queryFn: async () => {
      try {
        const appsRef = collection(db, "facultyApplications");
        const snap = await getDocs(appsRef);

        let list: FacultyApplication[] = snap.docs.map((d) => {
          const data = d.data();
          const rawStatus = String(data.status || "PENDING").toUpperCase();
          const normalizedStatus =
            rawStatus === "APPROVED"
              ? "APPROVED"
              : rawStatus === "REJECTED"
              ? "REJECTED"
              : "PENDING";

          return {
            id: d.id,
            applicationId: data.applicationId || d.id,
            uid: data.uid,
            fullName: data.fullName || data.displayName || data.name || "Faculty Applicant",
            officialEmail: data.officialEmail || data.email || "",
            mobileNumber: data.mobileNumber || data.phoneNumber || data.phone || data.mobile || "",
            employeeId: data.employeeId || "",
            department: data.department || "Department of Computer Science & Engineering",
            school: data.school || "School of Technology",
            designation: data.designation || "Assistant Professor",
            alternateEmail: data.alternateEmail || "",
            role: "faculty" as const,
            status: normalizedStatus,
            approvalStatus: data.approvalStatus || (normalizedStatus === "APPROVED" ? "approved" : normalizedStatus === "REJECTED" ? "rejected" : "pending"),
            isApproved: normalizedStatus === "APPROVED",
            approvalEmailSent: data.approvalEmailSent ?? (normalizedStatus === "APPROVED"),
            approvalEmailSentAt: data.approvalEmailSentAt ? safeToDate(data.approvalEmailSentAt) : null,
            submittedAt: data.submittedAt ? safeToDate(data.submittedAt) : data.createdAt ? safeToDate(data.createdAt) : new Date(),
            reviewedAt: data.reviewedAt ? safeToDate(data.reviewedAt) : data.approvedAt ? safeToDate(data.approvedAt) : null,
            reviewedBy: data.reviewedBy || data.approvedBy || null,
            approvedAt: data.approvedAt ? safeToDate(data.approvedAt) : null,
            approvedBy: data.approvedBy || null,
            rejectionReason: data.rejectionReason || null,
          };
        });

        if (statusFilter && statusFilter !== "ALL") {
          const filterUpper = String(statusFilter).toUpperCase();
          list = list.filter((a) => {
            if (filterUpper === "PENDING" || filterUpper === "PENDING_APPROVAL") {
              return a.status === "PENDING" || a.status === "PENDING_APPROVAL" || a.status === "pending";
            }
            if (filterUpper === "APPROVED") {
              return a.status === "APPROVED" || a.status === "approved";
            }
            if (filterUpper === "REJECTED") {
              return a.status === "REJECTED" || a.status === "rejected";
            }
            return a.status === statusFilter;
          });
        }

        return list.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      } catch (err) {
        console.warn("[useAllFacultyApplications] notice:", err);
        return [];
      }
    },
    staleTime: 1000 * 10,
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
      if (!appSnap.exists()) {
        throw new Error("Faculty application document not found.");
      }
      const appData = appSnap.data();

      // 1. Resolve target UID
      let targetUid = uid || appData.uid;
      if (!targetUid && email) {
        const usersSnap = await getDocs(query(collection(db, "users"), where("email", "==", email.toLowerCase().trim())));
        if (!usersSnap.empty) {
          targetUid = usersSnap.docs[0].id;
        }
      }

      if (!targetUid) {
        throw new Error("Could not resolve authenticated Firebase UID for this faculty member.");
      }

      const userRef = doc(db, "users", targetUid);
      const now = new Date();

      // 2. Perform atomic batch update for both facultyApplications and users/{uid}
      const batch = writeBatch(db);

      batch.set(
        appRef,
        {
          status: "APPROVED",
          approvalStatus: "approved",
          isApproved: true,
          approvedAt: now,
          approvedBy: adminUid,
          reviewedAt: now,
          reviewedBy: adminUid,
          updatedAt: now,
        },
        { merge: true }
      );

      batch.set(
        userRef,
        {
          uid: targetUid,
          email: email || appData.officialEmail || appData.email,
          displayName: fullName || appData.fullName || "Faculty Member",
          role: "faculty",
          status: "ACTIVE",
          accountStatus: "active",
          approvalStatus: "approved",
          isApproved: true,
          approvedAt: now,
          approvedBy: adminUid,
          department: appData.department || "Department of Computer Science & Engineering",
          school: appData.school || "School of Technology",
          designation: appData.designation || "Assistant Professor",
          employeeId: appData.employeeId || "",
          onboardingCompleted: true,
          updatedAt: now,
        },
        { merge: true }
      );

      await batch.commit();

      // 3. Queue Approval Email with Duplication Protection
      let emailSent = false;
      if (!appData.approvalEmailSent) {
        try {
          const facultyName = fullName || appData.fullName || "Faculty Member";
          const facultyEmail = email || appData.officialEmail || appData.email;

          // Universal mail queue for server-side delivery
          const mailDocRef = doc(collection(db, "mail"));
          await setDoc(mailDocRef, {
            to: facultyEmail,
            message: {
              subject: "Faculty Access Approved — Apollo University Event Hub",
              text: `Dear ${facultyName},\n\nYour faculty access request for the Apollo University Event Hub has been approved by the administrator.\n\nYou can now log in to the Faculty Portal.\n\nLogin here:\n\nhttps://theapolloeventhub.web.app/login\n\nYour registered email:\n${facultyEmail}\n\nIf you did not request this access, please contact the administrator.\n\nRegards,\nApollo University Event Hub\nSchool of Technology`,
              html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="background-color: #004D61; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 24px;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 20px;">The Apollo University Event Hub</h2>
                </div>
                <p style="font-size: 15px; color: #1e293b;">Dear <strong>${facultyName}</strong>,</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">Your faculty access request for the <strong>Apollo University Event Hub</strong> has been approved by the administrator.</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">You can now log in to the Faculty Portal.</p>
                <div style="margin: 28px 0; text-align: center;">
                  <a href="https://theapolloeventhub.web.app/login" style="background-color: #007A99; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Login here &rarr;</a>
                </div>
                <p style="font-size: 13px; color: #475569;">Your registered email:<br><strong>${facultyEmail}</strong></p>
                <p style="font-size: 13px; color: #475569;">If you did not request this access, please contact the administrator.</p>
                <p style="font-size: 13px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                  Regards,<br>
                  <strong>Apollo University Event Hub</strong><br>
                  School of Technology
                </p>
              </div>`,
            },
            createdAt: new Date(),
          });

          // In-app notification queue
          const notificationDocRef = doc(collection(db, "notifications"));
          await setDoc(notificationDocRef, {
            recipientUid: targetUid,
            recipientEmail: facultyEmail,
            type: "ACCESS_APPROVED",
            title: "Faculty Access Approved — Apollo University Event Hub",
            message: `Dear ${facultyName},\n\nYour faculty access request for the Apollo University Event Hub has been approved by the administrator.\n\nYou can now log in to the Faculty Portal.\n\nLogin here: https://theapolloeventhub.web.app/login`,
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
          fullName: fullName || appData.fullName,
          employeeId: appData.employeeId,
          department: appData.department,
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
        toast.success("Faculty access approved successfully. An approval email has been sent.", {
          description: `Approval confirmed for ${data.email}. Faculty member can now sign in.`,
        });
      } else {
        toast.info("Faculty access approved successfully, but the approval email could not be sent.", {
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
      if (!appSnap.exists()) {
        throw new Error("Faculty application document not found.");
      }
      const appData = appSnap.data();

      // 1. Resolve target UID
      let targetUid = uid || appData.uid;
      if (!targetUid && email) {
        const usersSnap = await getDocs(query(collection(db, "users"), where("email", "==", email.toLowerCase().trim())));
        if (!usersSnap.empty) {
          targetUid = usersSnap.docs[0].id;
        }
      }

      const now = new Date();
      const batch = writeBatch(db);

      // 2. Update application status
      batch.set(
        appRef,
        {
          status: "REJECTED",
          approvalStatus: "rejected",
          isApproved: false,
          rejectionReason: reason || "Did not meet institutional criteria",
          reviewedAt: now,
          reviewedBy: adminUid,
          updatedAt: now,
        },
        { merge: true }
      );

      // 3. Update user document
      if (targetUid) {
        const userRef = doc(db, "users", targetUid);
        batch.set(
          userRef,
          {
            status: "REJECTED",
            accountStatus: "rejected",
            approvalStatus: "rejected",
            isApproved: false,
            rejectionReason: reason || "Did not meet institutional criteria",
            updatedAt: now,
          },
          { merge: true }
        );
      }

      await batch.commit();

      // 4. Log immutable audit trail
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
          fullName: appData.fullName,
          employeeId: appData.employeeId,
          department: appData.department,
          reason,
        },
      });

      return { success: true, applicationId, email };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "faculty-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users-directory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-metrics"] });

      toast.success("Faculty application rejected.", {
        description: `Application for ${data.email} has been marked as rejected.`,
      });
    },
    onError: (err) => {
      toast.error("Rejection Failed", { description: err.message || "Unable to reject faculty application." });
    },
  });
}
