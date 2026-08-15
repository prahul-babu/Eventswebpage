import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/lib/firebase";
import { getEventsCollection, getRegistrationsCollection } from "@/lib/converters";
import type { Event, Registration, CreateEventPayload } from "@/types";
import { toast } from "sonner";

export interface FacultyDashboardMetrics {
  totalEvents: number;
  pendingApprovalCount: number;
  publishedCount: number;
  totalRegistrations: number;
  totalRevenue: number;
  needsAttention: {
    rejectedEvents: Event[];
    completedAwaitingReport: Event[];
    closingSoonEvents: Event[];
  };
}

function cleanFirestorePayload(raw: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 1. Fetch All Events Organized by Faculty
 */
export function useFacultyEvents(facultyUid?: string | null) {
  return useQuery<Event[]>({
    queryKey: ["faculty", "events", facultyUid],
    enabled: Boolean(facultyUid),
    queryFn: async () => {
      if (!facultyUid) return [];

      const eventsRef = getEventsCollection(db);
      const q = query(
        eventsRef,
        where("organiserId", "==", facultyUid)
      );

      const snap = await getDocs(q);
      return snap.docs
        .map((d) => d.data())
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    },
    staleTime: 1000 * 60,
  });
}

/**
 * 2. Faculty Dashboard Aggregated Metrics & Attention Items
 */
export function useFacultyDashboardMetrics(facultyUid?: string | null) {
  return useQuery<FacultyDashboardMetrics>({
    queryKey: ["faculty", "dashboard-metrics", facultyUid],
    enabled: Boolean(facultyUid),
    queryFn: async () => {
      if (!facultyUid) {
        return {
          totalEvents: 0,
          pendingApprovalCount: 0,
          publishedCount: 0,
          totalRegistrations: 0,
          totalRevenue: 0,
          needsAttention: {
            rejectedEvents: [],
            completedAwaitingReport: [],
            closingSoonEvents: [],
          },
        };
      }

      const eventsRef = getEventsCollection(db);
      const q = query(eventsRef, where("organiserId", "==", facultyUid));
      const snap = await getDocs(q);
      const events = snap.docs.map((d) => d.data());

      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      let totalRegistrations = 0;
      let totalRevenue = 0;
      let pendingApprovalCount = 0;
      let publishedCount = 0;

      const rejectedEvents: Event[] = [];
      const completedAwaitingReport: Event[] = [];
      const closingSoonEvents: Event[] = [];

      for (const event of events) {
        totalRegistrations += event.registeredCount || 0;
        if (event.isPaid && event.price > 0) {
          totalRevenue += (event.registeredCount || 0) * event.price;
        }

        if (event.status === "PENDING_APPROVAL") {
          pendingApprovalCount++;
        } else if (event.status === "PUBLISHED" || event.status === "ONGOING") {
          publishedCount++;
        }

        if (event.status === "REJECTED") {
          rejectedEvents.push(event);
        }

        if (event.status === "COMPLETED" && (!(event as any).reportStatus || (event as any).reportStatus === "NOT_STARTED")) {
          completedAwaitingReport.push(event);
        }

        const deadline = new Date(event.registrationDeadline);
        if (
          (event.status === "PUBLISHED" || event.status === "ONGOING") &&
          deadline > now &&
          deadline <= in48Hours
        ) {
          closingSoonEvents.push(event);
        }
      }

      return {
        totalEvents: events.length,
        pendingApprovalCount,
        publishedCount,
        totalRegistrations,
        totalRevenue,
        needsAttention: {
          rejectedEvents,
          completedAwaitingReport,
          closingSoonEvents,
        },
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * 3. Save / Autosave Event Draft Mutation
 */
export function useSaveEventDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    { eventId: string; isNew: boolean },
    Error,
    { eventId?: string; data: Partial<CreateEventPayload>; organiser: { uid: string; name: string; email: string; department: string } }
  >({
    mutationFn: async ({ eventId, data, organiser }) => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {}
      }

      const isNew = !eventId;
      const targetId = eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const eventDocRef = doc(db, "events", targetId);

      const rawPayload: Record<string, any> = {
        id: targetId,
        title: data.title || "Untitled Draft Event",
        description: data.description || "",
        category: data.category || "ACADEMIC",
        status: "DRAFT",
        venueType: data.venueType || "ON_CAMPUS",
        venueLocation: data.venueLocation || "Campus Venue",
        startAt: data.startAt ? new Date(data.startAt) : new Date(Date.now() + 7 * 24 * 3600 * 1000),
        endAt: data.endAt ? new Date(data.endAt) : new Date(Date.now() + 7 * 24 * 3600 * 1000 + 3600 * 1000),
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : new Date(Date.now() + 6 * 24 * 3600 * 1000),
        registrationStartAt: data.registrationStartAt ? new Date(data.registrationStartAt) : null,
        isPaid: Boolean(data.isPaid),
        price: data.isPaid ? Number(data.price || 0) : 0,
        currency: "INR",
        capacity: Number(data.capacity || 100),
        registeredCount: 0,
        allowWaitlist: Boolean(data.allowWaitlist),
        maxTeamSize: Number(data.maxTeamSize || 1),
        bannerUrl: data.bannerUrl || "",
        tags: data.tags || [],
        eligibility: data.eligibility || "",
        prerequisites: data.prerequisites || "",
        customQuestions: data.customQuestions || [],
        organiserId: organiser.uid,
        organiserName: organiser.name,
        organiserEmail: organiser.email,
        organiserRole: "faculty",
        department: organiser.department,
        updatedAt: serverTimestamp(),
      };

      if (isNew) {
        rawPayload.createdAt = serverTimestamp();
      }

      const payload = cleanFirestorePayload(rawPayload);
      await setDoc(eventDocRef, payload, { merge: true });
      return { eventId: targetId, isNew };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["faculty", "events"] });
      queryClient.invalidateQueries({ queryKey: ["event", result.eventId] });
    },
  });
}

/**
 * 4. Submit Event for Admin Approval Mutation
 */
export function useSubmitEventForApproval() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; eventId: string; status: string },
    Error,
    { eventId: string; data?: Partial<CreateEventPayload>; organiser?: { uid: string; name: string; email: string; department: string } }
  >({
    mutationFn: async ({ eventId, data, organiser }) => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {}
      }

      let targetId = eventId;
      if (!targetId || targetId.trim() === "") {
        targetId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      }

      if (data && organiser) {
        const rawPayload: Record<string, any> = {
          id: targetId,
          title: data.title || "Untitled Campus Event",
          description: data.description || "",
          category: data.category || "ACADEMIC",
          status: "PENDING_APPROVAL",
          venueType: data.venueType || "ON_CAMPUS",
          venueLocation: data.venueLocation || "Campus Venue",
          startAt: data.startAt ? new Date(data.startAt) : new Date(Date.now() + 7 * 24 * 3600 * 1000),
          endAt: data.endAt ? new Date(data.endAt) : new Date(Date.now() + 7 * 24 * 3600 * 1000 + 3600 * 1000),
          registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : new Date(Date.now() + 6 * 24 * 3600 * 1000),
          registrationStartAt: data.registrationStartAt ? new Date(data.registrationStartAt) : null,
          isPaid: Boolean(data.isPaid),
          price: data.isPaid ? Number(data.price || 0) : 0,
          currency: "INR",
          capacity: Number(data.capacity || 100),
          registeredCount: 0,
          allowWaitlist: Boolean(data.allowWaitlist),
          maxTeamSize: Number(data.maxTeamSize || 1),
          bannerUrl: data.bannerUrl || "",
          tags: data.tags || [],
          eligibility: data.eligibility || "",
          prerequisites: data.prerequisites || "",
          customQuestions: data.customQuestions || [],
          organiserId: organiser.uid,
          organiserName: organiser.name,
          organiserEmail: organiser.email,
          organiserRole: "faculty",
          department: organiser.department,
          submittedAt: new Date(),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };

        const payload = cleanFirestorePayload(rawPayload);
        await setDoc(doc(db, "events", targetId), payload, { merge: true });
        return { success: true, eventId: targetId, status: "PENDING_APPROVAL" };
      }

      try {
        const submitFn = httpsCallable<{ eventId: string }, { success: boolean; eventId: string; status: string }>(
          functions,
          "submitEventForApproval"
        );
        const result = await submitFn({ eventId: targetId });
        return result.data;
      } catch (fnErr) {
        console.info("[Faculty] Direct Firestore submission fallback active:", fnErr);
        const eventDocRef = doc(db, "events", targetId);
        await updateDoc(eventDocRef, {
          status: "PENDING_APPROVAL",
          submittedAt: new Date(),
          updatedAt: new Date(),
        });
        return { success: true, eventId: targetId, status: "PENDING_APPROVAL" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty", "events"] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });

      toast.success("Submitted for Approval", {
        description: "Your event was sent to the campus administration board for review.",
      });
    },
    onError: (err) => {
      toast.error("Submission Error", {
        description: err.message || "Failed to submit event for approval.",
      });
    },
  });
}

/**
 * 5. Withdraw Event from Approval Mutation
 */
export function useWithdrawEvent() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; eventId: string; status: string }, Error, { eventId: string }>({
    mutationFn: async ({ eventId }) => {
      try {
        const withdrawFn = httpsCallable<{ eventId: string }, { success: boolean; eventId: string; status: string }>(
          functions,
          "withdrawEvent"
        );
        const result = await withdrawFn({ eventId });
        return result.data;
      } catch (fnErr) {
        console.info("[Faculty] Direct Firestore withdrawal fallback active:", fnErr);
        const eventDocRef = doc(db, "events", eventId);
        await updateDoc(eventDocRef, {
          status: "DRAFT",
          withdrawnAt: new Date(),
          updatedAt: new Date(),
        });
        return { success: true, eventId, status: "DRAFT" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty", "events"] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "dashboard-metrics"] });

      toast.info("Event Withdrawn", {
        description: "The event has been returned to your drafts.",
      });
    },
    onError: (err) => {
      toast.error("Withdrawal Error", {
        description: err.message || "Failed to withdraw event.",
      });
    },
  });
}

/**
 * 6. Fetch Event Registrants Roster
 */
export function useEventRegistrants(eventId?: string) {
  return useQuery<Registration[]>({
    queryKey: ["faculty", "event-registrants", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) return [];

      const regsRef = getRegistrationsCollection(db);
      const q = query(
        regsRef,
        where("eventId", "==", eventId)
      );

      const snap = await getDocs(q);
      return snap.docs
        .map((d) => d.data())
        .sort((a, b) => (b.registeredAt?.getTime() || 0) - (a.registeredAt?.getTime() || 0));
    },
    staleTime: 1000 * 30,
  });
}

/**
 * 7. Toggle Attendee Gate Attendance Check-In
 */
export function useToggleAttendance() {
  const queryClient = useQueryClient();

  return useMutation<
    { registrationId: string; checkedIn: boolean },
    Error,
    { registrationId: string; eventId: string; checkedIn: boolean }
  >({
    mutationFn: async ({ registrationId, checkedIn }) => {
      const regDocRef = doc(db, "registrations", registrationId);
      await updateDoc(regDocRef, {
        checkedIn: checkedIn,
        checkedInAt: checkedIn ? new Date() : null,
      });
      return { registrationId, checkedIn };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["faculty", "event-registrants", variables.eventId] });
      toast.success(data.checkedIn ? "Attendee Checked In" : "Check-in Undone");
    },
    onError: (err) => {
      toast.error("Attendance Update Failed", { description: err.message });
    },
  });
}
