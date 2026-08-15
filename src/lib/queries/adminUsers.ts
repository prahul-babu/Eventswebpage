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
import { db, functions } from "@/lib/firebase";
import {
  getUsersCollection,
  getEventsCollection,
  getRegistrationsCollection,
  getEventReportsCollection,
} from "@/lib/converters";
import type { User, UserRole, UserStatus } from "@/types";
import { toast } from "sonner";

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
      const confirmedRegs = allRegs.filter((r) => r.status === "CONFIRMED");

      const totalRevenue = confirmedRegs.reduce((acc, r) => acc + (r.amountPaid || 0), 0);

      const reportsSnap = await getDocs(getEventReportsCollection(db));
      const pendingReportsCount = reportsSnap.docs.filter((d) => d.data().status === "SUBMITTED").length;

      return {
        totalUsers: allUsers.length,
        studentsCount,
        facultyCount,
        adminCount,
        pendingUsersCount,
        pendingEventsCount,
        publishedEventsCount,
        totalRegistrations: confirmedRegs.length,
        totalRevenue,
        pendingReportsCount,
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
      const logsRef = collection(db, "auditLogs");
      let q = query(logsRef, orderBy("timestamp", "desc"), limit(100));

      if (filters?.action && filters.action !== "ALL") {
        q = query(logsRef, where("action", "==", filters.action), orderBy("timestamp", "desc"), limit(100));
      }

      const snap = await getDocs(q);
      let list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          action: data.action || "SYSTEM_EVENT",
          actorUid: data.actorUid || "system",
          actorEmail: data.actorEmail || "system@apollouniversity.edu.in",
          actorRole: data.actorRole || "SYSTEM",
          targetUid: data.targetUid,
          details: data.details || {},
          timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date(),
        } as AuditLogEntry;
      });

      if (filters?.actorEmail && filters.actorEmail.trim()) {
        const term = filters.actorEmail.toLowerCase().trim();
        list = list.filter((l) => l.actorEmail.toLowerCase().includes(term));
      }

      return list;
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

      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        return { user: null, eventsOrganised: [], registrations: [], payments: [] };
      }

      const user = userSnap.data() as User;

      // Events organised by this user
      const eventsRef = getEventsCollection(db);
      const eventsQ = query(eventsRef, where("organiserId", "==", uid));
      const eventsSnap = await getDocs(eventsQ);
      const eventsOrganised = eventsSnap.docs.map((d) => d.data());

      // Registrations
      const regsRef = getRegistrationsCollection(db);
      const regsQ = query(regsRef, where("userId", "==", uid));
      const regsSnap = await getDocs(regsQ);
      const registrations = regsSnap.docs.map((d) => d.data());

      // Payments
      const paymentsRef = collection(db, "payments");
      const paymentsQ = query(paymentsRef, where("userId", "==", uid));
      const paymentsSnap = await getDocs(paymentsQ);
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
      const setRoleFn = httpsCallable<typeof payload, { success: boolean }>(functions, "setUserRole");
      const result = await setRoleFn(payload);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users-directory"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", variables.targetUid] });

      if (variables.status === "ACTIVE") {
        toast.success("User Access Approved", {
          description: `Assigned role ${variables.role.toUpperCase()} with active credentials.`,
        });
      } else if (variables.status === "REJECTED") {
        toast.error("Access Request Rejected", {
          description: "Rejection notification dispatched to applicant.",
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
