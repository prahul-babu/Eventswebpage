import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { getRegistrationsCollection, getEventsCollection } from "@/lib/converters";
import type {
  Registration,
  Event,
  CreateRegistrationPayload,
  CreateRegistrationResponse,
  CancelRegistrationPayload,
  CancelRegistrationResponse,
} from "@/types";
import { toast } from "sonner";

export interface StudentRegistrationItem {
  registration: Registration;
  event: Event;
}

/**
 * 1. Fetch Single Event Detail Hook
 */
export function useEventDetail(eventId?: string) {
  return useQuery<Event | null>({
    queryKey: ["event", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) return null;
      const eventDocRef = doc(getEventsCollection(db), eventId);
      const snap = await getDoc(eventDocRef);
      if (!snap.exists()) return null;
      return snap.data();
    },
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * 2. Fetch User's Existing Booking for a Specific Event
 */
export function useEventUserRegistration(eventId?: string, userId?: string | null) {
  return useQuery<Registration | null>({
    queryKey: ["registration", "event", eventId, userId],
    enabled: Boolean(eventId && userId),
    queryFn: async () => {
      if (!eventId || !userId) return null;

      const regsRef = getRegistrationsCollection(db);
      const q = query(
        regsRef,
        where("eventId", "==", eventId),
        where("userId", "==", userId)
      );

      const snap = await getDocs(q);
      if (snap.empty) return null;

      const active = snap.docs.map((d) => d.data()).find((r) => r.status !== "CANCELLED");
      return active || snap.docs[0].data();
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * 3. Fetch All Student Registrations (Separated into Upcoming & Past)
 */
export function useStudentRegistrations(userId?: string | null) {
  return useQuery<{
    upcoming: StudentRegistrationItem[];
    past: StudentRegistrationItem[];
    all: StudentRegistrationItem[];
  }>({
    queryKey: ["student", "registrations", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return { upcoming: [], past: [], all: [] };

      const regsRef = getRegistrationsCollection(db);
      const q = query(
        regsRef,
        where("userId", "==", userId),
        orderBy("registeredAt", "desc")
      );

      const regsSnap = await getDocs(q);
      if (regsSnap.empty) return { upcoming: [], past: [], all: [] };

      const registrations = regsSnap.docs.map((d) => d.data());
      const eventsRef = getEventsCollection(db);
      const items: StudentRegistrationItem[] = [];

      for (const reg of registrations) {
        const eventDocRef = doc(eventsRef, reg.eventId);
        const eventSnap = await getDoc(eventDocRef);
        if (eventSnap.exists()) {
          items.push({ registration: reg, event: eventSnap.data() });
        }
      }

      const now = new Date();
      const upcoming = items.filter(
        (i) => i.registration.status !== "CANCELLED" && i.event.endAt >= now
      );
      const past = items.filter(
        (i) => i.registration.status === "CANCELLED" || i.event.endAt < now
      );

      return { upcoming, past, all: items };
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * 4. Create Registration Mutation (Calls Cloud Function)
 */
export function useCreateRegistration() {
  const queryClient = useQueryClient();

  return useMutation<CreateRegistrationResponse, Error, CreateRegistrationPayload>({
    mutationFn: async (payload) => {
      const createFn = httpsCallable<CreateRegistrationPayload, CreateRegistrationResponse>(
        functions,
        "createRegistration"
      );
      const result = await createFn(payload);
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["registration", "event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["student", "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["student", "next-registration"] });
      queryClient.invalidateQueries({ queryKey: ["student", "stats"] });

      if (data.status === "WAITLISTED") {
        toast.info("Added to Waitlist", {
          description: "You have been placed on the priority waitlist for this event.",
        });
      } else {
        toast.success("Registration Confirmed!", {
          description: `Your ticket pass code is ${data.ticketCode}.`,
        });
      }
    },
    onError: (err) => {
      toast.error("Registration Failed", {
        description: err.message || "Failed to complete event registration.",
      });
    },
  });
}

/**
 * 5. Cancel Registration Mutation (Calls Cloud Function)
 */
export function useCancelRegistration() {
  const queryClient = useQueryClient();

  return useMutation<CancelRegistrationResponse, Error, CancelRegistrationPayload>({
    mutationFn: async (payload) => {
      const cancelFn = httpsCallable<CancelRegistrationPayload, CancelRegistrationResponse>(
        functions,
        "cancelRegistration"
      );
      const result = await cancelFn(payload);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event"] });
      queryClient.invalidateQueries({ queryKey: ["registration"] });
      queryClient.invalidateQueries({ queryKey: ["student", "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["student", "next-registration"] });
      queryClient.invalidateQueries({ queryKey: ["student", "stats"] });

      toast.info("Registration Cancelled", {
        description: "Your seat has been released.",
      });
    },
    onError: (err) => {
      toast.error("Cancellation Error", {
        description: err.message || "Unable to cancel registration at this time.",
      });
    },
  });
}
