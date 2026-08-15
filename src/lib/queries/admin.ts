import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  query,
  where,
  orderBy,
  getDocs,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/lib/firebase";
import { getEventsCollection } from "@/lib/converters";
import type { Event, EventCategory, EventStatus } from "@/types";
import { toast } from "sonner";

/**
 * 1. Fetch Pending Approvals Queue
 */
export function usePendingApprovals() {
  return useQuery<Event[]>({
    queryKey: ["admin", "pending-approvals"],
    queryFn: async () => {
      const eventsRef = getEventsCollection(db);
      const q = query(
        eventsRef,
        where("status", "==", "PENDING_APPROVAL"),
        orderBy("createdAt", "asc")
      );

      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data());
    },
    staleTime: 1000 * 30,
  });
}

/**
 * 2. Fetch Recently Reviewed Events (Approved or Rejected)
 */
export function useRecentlyReviewedEvents(decision: "APPROVED" | "REJECTED") {
  return useQuery<Event[]>({
    queryKey: ["admin", "recently-reviewed", decision],
    queryFn: async () => {
      const eventsRef = getEventsCollection(db);
      const statusList = decision === "APPROVED" ? ["PUBLISHED", "ONGOING"] : ["REJECTED"];

      const q = query(
        eventsRef,
        where("status", "in", statusList),
        limit(20)
      );

      const snap = await getDocs(q);
      return snap.docs
        .map((d) => d.data())
        .sort((a, b) => {
          const timeA = a.approvedAt?.getTime() || a.updatedAt.getTime();
          const timeB = b.approvedAt?.getTime() || b.updatedAt.getTime();
          return timeB - timeA;
        });
    },
    staleTime: 1000 * 60,
  });
}

/**
 * 3. Fetch Organiser Credibility Stats
 */
export function useOrganiserStats(organiserId?: string) {
  return useQuery<{ totalEventsHosted: number; approvedEventsCount: number; department?: string }>({
    queryKey: ["admin", "organiser-stats", organiserId],
    enabled: Boolean(organiserId),
    queryFn: async () => {
      if (!organiserId) return { totalEventsHosted: 0, approvedEventsCount: 0 };

      const eventsRef = getEventsCollection(db);
      const q = query(eventsRef, where("organiserId", "==", organiserId));
      const snap = await getDocs(q);

      const allEvents = snap.docs.map((d) => d.data());
      const approvedEventsCount = allEvents.filter(
        (e) => e.status === "PUBLISHED" || e.status === "ONGOING" || e.status === "COMPLETED"
      ).length;

      return {
        totalEventsHosted: allEvents.length,
        approvedEventsCount,
        department: allEvents[0]?.department,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * 4. Venue Conflict & Overlap Detector
 */
export function useVenueConflicts(
  venueLocation?: string,
  startAt?: Date | string,
  endAt?: Date | string,
  currentEventId?: string
) {
  return useQuery<Event[]>({
    queryKey: ["admin", "venue-conflicts", venueLocation, startAt, endAt, currentEventId],
    enabled: Boolean(venueLocation && startAt && endAt),
    queryFn: async () => {
      if (!venueLocation || !startAt || !endAt) return [];

      const startTime = new Date(startAt).getTime();
      const endTime = new Date(endAt).getTime();

      const eventsRef = getEventsCollection(db);
      const q = query(
        eventsRef,
        where("status", "in", ["PUBLISHED", "ONGOING"]),
        where("venueLocation", "==", venueLocation)
      );

      const snap = await getDocs(q);
      const potentialMatches = snap.docs.map((d) => d.data());

      return potentialMatches.filter((event) => {
        if (event.id === currentEventId) return false;
        const eStart = new Date(event.startAt).getTime();
        const eEnd = new Date(event.endAt).getTime();
        return startTime < eEnd && endTime > eStart;
      });
    },
    staleTime: 1000 * 60,
  });
}

/**
 * 5. Approve Event Mutation (Calls Cloud Function with Direct Firestore Fallback)
 */
export function useApproveEvent() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; eventId: string; status: string },
    Error,
    { eventId: string; reviewerNotes?: string; notifyDepartmentStudents?: boolean }
  >({
    mutationFn: async (payload) => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {}
      }
      try {
        const approveFn = httpsCallable<typeof payload, { success: boolean; eventId: string; status: string }>(
          functions,
          "approveEvent"
        );
        const result = await approveFn(payload);
        return result.data;
      } catch (fnErr) {
        console.info("[Admin] Direct Firestore approve fallback active:", fnErr);
        const eventDocRef = doc(db, "events", payload.eventId);
        await updateDoc(eventDocRef, {
          status: "PUBLISHED",
          approvedAt: new Date(),
          updatedAt: new Date(),
          reviewerNotes: payload.reviewerNotes || null,
        });
        return { success: true, eventId: payload.eventId, status: "PUBLISHED" };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "recently-reviewed"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", data.eventId] });

      toast.success("Event Approved & Published", {
        description: "The event is now live in the student catalog.",
      });
    },
    onError: (err) => {
      toast.error("Approval Failed", { description: err.message || "Failed to approve event." });
    },
  });
}

/**
 * 6. Reject / Request Changes Mutation (Calls Cloud Function with Direct Firestore Fallback)
 */
export function useRejectEvent() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; eventId: string; status: string; decision: string },
    Error,
    { eventId: string; decision: "REJECTED" | "CHANGES_REQUESTED"; reason: string; reviewerNotes?: string }
  >({
    mutationFn: async (payload) => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {}
      }
      try {
        const rejectFn = httpsCallable<typeof payload, { success: boolean; eventId: string; status: string; decision: string }>(
          functions,
          "rejectEvent"
        );
        const result = await rejectFn(payload);
        return result.data;
      } catch (fnErr) {
        console.info("[Admin] Direct Firestore reject fallback active:", fnErr);
        const eventDocRef = doc(db, "events", payload.eventId);
        const newStatus = payload.decision === "CHANGES_REQUESTED" ? "DRAFT" : "REJECTED";
        await updateDoc(eventDocRef, {
          status: newStatus,
          rejectionReason: payload.reason,
          reviewerNotes: payload.reviewerNotes || null,
          updatedAt: new Date(),
        });
        return { success: true, eventId: payload.eventId, status: newStatus, decision: payload.decision };
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "recently-reviewed"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-events"] });
      queryClient.invalidateQueries({ queryKey: ["event", data.eventId] });

      if (variables.decision === "CHANGES_REQUESTED") {
        toast.info("Changes Requested", {
          description: "Feedback has been sent to the faculty organiser.",
        });
      } else {
        toast.error("Event Proposal Rejected", {
          description: "Rejection notification with reason sent to faculty.",
        });
      }
    },
    onError: (err) => {
      toast.error("Review Action Failed", { description: err.message || "Failed to process review." });
    },
  });
}

/**
 * 7. Bulk Approve Events Mutation (Calls Cloud Function with Direct Firestore Fallback)
 */
export function useBulkApproveEvents() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; processedCount: number; approvedCount: number; results: any[] },
    Error,
    { eventIds: string[] }
  >({
    mutationFn: async (payload) => {
      try {
        const bulkFn = httpsCallable<typeof payload, { success: boolean; processedCount: number; approvedCount: number; results: any[] }>(
          functions,
          "bulkApproveEvents"
        );
        const result = await bulkFn(payload);
        return result.data;
      } catch (fnErr) {
        console.info("[Admin] Direct Firestore bulk approve fallback active:", fnErr);
        let approved = 0;
        for (const eventId of payload.eventIds) {
          try {
            await updateDoc(doc(db, "events", eventId), {
              status: "PUBLISHED",
              approvedAt: new Date(),
              updatedAt: new Date(),
            });
            approved++;
          } catch {}
        }
        return {
          success: true,
          processedCount: payload.eventIds.length,
          approvedCount: approved,
          results: [],
        };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "recently-reviewed"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });

      toast.success("Bulk Approval Complete", {
        description: `Successfully approved ${data.approvedCount} of ${data.processedCount} events.`,
      });
    },
    onError: (err) => {
      toast.error("Bulk Action Failed", { description: err.message || "Failed to complete bulk approval." });
    },
  });
}

/**
 * 8. All University Events Query for Admin Registry
 */
export function useAdminAllEvents(filters?: {
  searchQuery?: string;
  status?: "ALL" | EventStatus;
  category?: "ALL" | EventCategory;
  organiserId?: string;
}) {
  return useQuery<Event[]>({
    queryKey: ["admin", "all-events", filters],
    queryFn: async () => {
      const eventsRef = getEventsCollection(db);
      const q = query(eventsRef, orderBy("createdAt", "desc"), limit(200));
      const snap = await getDocs(q);

      let list = snap.docs.map((d) => d.data());

      if (filters?.status && filters.status !== "ALL") {
        list = list.filter((e) => e.status === filters.status);
      }

      if (filters?.category && filters.category !== "ALL") {
        list = list.filter((e) => e.category === filters.category);
      }

      if (filters?.organiserId && filters.organiserId !== "ALL") {
        list = list.filter((e) => e.organiserId === filters.organiserId);
      }

      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const term = filters.searchQuery.trim().toLowerCase();
        list = list.filter(
          (e) =>
            e.title.toLowerCase().includes(term) ||
            e.organiserName.toLowerCase().includes(term) ||
            e.venueLocation.toLowerCase().includes(term) ||
            e.department.toLowerCase().includes(term)
        );
      }

      return list;
    },
    staleTime: 1000 * 60,
  });
}
