import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import {
  getEventReportDoc,
  getEventReportsCollection,
  getEventsCollection,
  getRegistrationsCollection,
} from "@/lib/converters";
import type { EventReport, Event, EventReportStatus } from "@/types";
import { toast } from "sonner";

/**
 * 1. Fetch Single Event Post-Report by eventId
 */
export function useEventReport(eventId?: string) {
  return useQuery<EventReport | null>({
    queryKey: ["report", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) return null;
      const reportDocRef = getEventReportDoc(db, eventId);
      const snap = await getDoc(reportDocRef);
      if (!snap.exists()) return null;
      return snap.data();
    },
    staleTime: 1000 * 30,
  });
}

/**
 * 2. Fetch Faculty Reports Hub (Completed Events + Report Status)
 */
export function useFacultyReports(facultyUid?: string | null) {
  return useQuery<{ event: Event; reportStatus: EventReportStatus; report?: EventReport }[]>({
    queryKey: ["faculty", "reports", facultyUid],
    enabled: Boolean(facultyUid),
    queryFn: async () => {
      if (!facultyUid) return [];

      const eventsRef = getEventsCollection(db);
      const q = query(
        eventsRef,
        where("organiserId", "==", facultyUid),
        where("status", "in", ["COMPLETED", "ONGOING", "PUBLISHED"])
      );

      const snap = await getDocs(q);
      const events = snap.docs.map((d) => d.data());

      const result: { event: Event; reportStatus: EventReportStatus; report?: EventReport }[] = [];

      for (const event of events) {
        const reportRef = getEventReportDoc(db, event.id);
        const reportSnap = await getDoc(reportRef);
        const report = reportSnap.exists() ? reportSnap.data() : undefined;
        const reportStatus: EventReportStatus = report?.status || "NOT_STARTED";

        result.push({
          event,
          reportStatus,
          report,
        });
      }

      return result.sort((a, b) => b.event.startAt.getTime() - a.event.startAt.getTime());
    },
    staleTime: 1000 * 60,
  });
}

/**
 * 3. Autosave / Save Report Draft Mutation
 */
export function useSaveReportDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; eventId: string },
    Error,
    { eventId: string; reportData: Partial<EventReport> }
  >({
    mutationFn: async ({ eventId, reportData }) => {
      const reportDocRef = getEventReportDoc(db, eventId);
      const snap = await getDoc(reportDocRef);

      const now = new Date();
      if (!snap.exists()) {
        const initialReport: EventReport = {
          id: eventId,
          eventId,
          eventTitle: reportData.eventTitle || "Untitled Event",
          category: reportData.category || "ACADEMIC",
          eventDate: reportData.eventDate || now,
          venueLocation: reportData.venueLocation || "Campus Venue",
          department: reportData.department || "Apollo University",
          organiserId: reportData.organiserId || "",
          organiserName: reportData.organiserName || "",
          organiserEmail: reportData.organiserEmail || "",
          status: "DRAFT",
          summary: reportData.summary || {
            executiveSummary: "",
            detailedProceedings: "",
            objectives: [],
            outcomesAchieved: [],
          },
          participation: reportData.participation || {
            registeredCount: 0,
            actualAttendance: 0,
            departmentWiseBreakdown: {},
            yearWiseBreakdown: {},
            externalParticipantsCount: 0,
            externalInstitutions: [],
            facultyCoordinators: [],
            studentVolunteersCount: 0,
            studentVolunteersNames: [],
          },
          resourcePersons: reportData.resourcePersons || [],
          finance: reportData.finance || {
            budgetAllocated: 0,
            budgetSpent: 0,
            balance: 0,
            expenses: [],
            sponsorships: [],
            revenueFromRegistrations: 0,
          },
          media: reportData.media || {
            photos: [],
            videos: [],
            documents: [],
          },
          feedback: reportData.feedback || {
            feedbackSummary: "",
            averageRating: 5,
            responseCount: 0,
            participantQuotes: [],
            suggestionsForFuture: "",
          },
          institutionalMapping: reportData.institutionalMapping || {
            academicYear: "2025-26",
            naacCriterion: "Criterion 1: Curricular Aspects",
            nbaProgrammeOutcomes: [],
            sdgGoals: [4],
            activityType: "Co-curricular",
            collaboratingInstitutions: [],
            certificatesIssuedCount: 0,
          },
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(reportDocRef, initialReport);
      } else {
        const existing = snap.data();
        const updated: EventReport = {
          ...existing,
          ...reportData,
          updatedAt: now,
        } as EventReport;
        await setDoc(reportDocRef, updated, { merge: true });
      }

      return { success: true, eventId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["report", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "reports"] });
    },
  });
}

/**
 * 4. Submit Event Report Mutation (Calls Cloud Function)
 */
export function useSubmitEventReport() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; eventId: string; status: string }, Error, { eventId: string }>({
    mutationFn: async (payload) => {
      const submitFn = httpsCallable<typeof payload, { success: boolean; eventId: string; status: string }>(
        functions,
        "submitEventReport"
      );
      const result = await submitFn(payload);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["report", data.eventId] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });

      toast.success("Post-Event Report Submitted", {
        description: "Your report has been sent to the Academic Dean and Administration Board.",
      });
    },
    onError: (err) => {
      toast.error("Submission Failed", { description: err.message || "Failed to submit report." });
    },
  });
}

/**
 * 5. Review Event Report Mutation (Calls Cloud Function)
 */
export function useReviewEventReport() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; eventId: string; status: string; decision: string },
    Error,
    { eventId: string; decision: "APPROVED" | "CHANGES_REQUESTED"; feedback?: string }
  >({
    mutationFn: async (payload) => {
      const reviewFn = httpsCallable<typeof payload, { success: boolean; eventId: string; status: string; decision: string }>(
        functions,
        "reviewEventReport"
      );
      const result = await reviewFn(payload);
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["report", data.eventId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "reports"] });

      if (variables.decision === "APPROVED") {
        toast.success("Report Approved & Archived", {
          description: "Institutional clearance granted for accreditation files.",
        });
      } else {
        toast.info("Revisions Requested", {
          description: "Feedback has been sent back to the organizing faculty member.",
        });
      }
    },
    onError: (err) => {
      toast.error("Review Action Failed", { description: err.message || "Failed to process review." });
    },
  });
}

/**
 * 6. Fetch Event Registrants Participation Breakdown (for auto-filling Section 2)
 */
export function useEventRegistrationMetrics(eventId?: string) {
  return useQuery<{
    registeredCount: number;
    departmentBreakdown: Record<string, number>;
    yearBreakdown: Record<string, number>;
    totalRevenue: number;
  }>({
    queryKey: ["report", "registration-metrics", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) {
        return { registeredCount: 0, departmentBreakdown: {}, yearBreakdown: {}, totalRevenue: 0 };
      }

      const regsRef = getRegistrationsCollection(db);
      const q = query(regsRef, where("eventId", "==", eventId));
      const snap = await getDocs(q);

      const confirmed = snap.docs.filter((d) => d.data().status === "CONFIRMED");
      const deptBreakdown: Record<string, number> = {};
      const yrBreakdown: Record<string, number> = {};
      let revenue = 0;

      for (const docSnap of confirmed) {
        const reg = docSnap.data();
        const dept = reg.userDepartment || "General";
        deptBreakdown[dept] = (deptBreakdown[dept] || 0) + 1;

        const yr = "Year 2025-26";
        yrBreakdown[yr] = (yrBreakdown[yr] || 0) + 1;

        if (reg.isPaid && reg.amountPaid) {
          revenue += reg.amountPaid;
        }
      }

      return {
        registeredCount: confirmed.length,
        departmentBreakdown: deptBreakdown,
        yearBreakdown: yrBreakdown,
        totalRevenue: revenue,
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * 7. Admin All Reports Archive Query
 */
export function useAdminAllReports(filters?: {
  searchQuery?: string;
  academicYear?: string;
  department?: string;
  naacCriterion?: string;
  status?: "ALL" | EventReportStatus;
}) {
  return useQuery<EventReport[]>({
    queryKey: ["admin", "reports", filters],
    queryFn: async () => {
      const reportsRef = getEventReportsCollection(db);
      const q = query(reportsRef, orderBy("createdAt", "desc"), limit(100));
      const snap = await getDocs(q);

      let list = snap.docs.map((d) => d.data());

      if (filters?.status && filters.status !== "ALL") {
        list = list.filter((r) => r.status === filters.status);
      }

      if (filters?.academicYear && filters.academicYear !== "ALL") {
        list = list.filter((r) => r.institutionalMapping?.academicYear === filters.academicYear);
      }

      if (filters?.department && filters.department !== "ALL") {
        list = list.filter((r) => r.department === filters.department);
      }

      if (filters?.naacCriterion && filters.naacCriterion !== "ALL") {
        list = list.filter((r) => r.institutionalMapping?.naacCriterion === filters.naacCriterion);
      }

      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const term = filters.searchQuery.trim().toLowerCase();
        list = list.filter(
          (r) =>
            r.eventTitle.toLowerCase().includes(term) ||
            r.organiserName.toLowerCase().includes(term) ||
            r.department.toLowerCase().includes(term)
        );
      }

      return list;
    },
    staleTime: 1000 * 60,
  });
}
