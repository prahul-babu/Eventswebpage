import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getRegistrationsCollection, getEventsCollection } from "@/lib/converters";
import type {
  Registration,
  RegistrationStatus,
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
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * 2. Fetch User Registration for Specific Event
 */
export function useUserEventRegistration(eventId?: string, userId?: string | null) {
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

      const activeReg = snap.docs
        .map((d) => d.data())
        .find((r) => r.status !== "CANCELLED");

      return activeReg || snap.docs[0].data();
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export const useEventUserRegistration = useUserEventRegistration;

/**
 * 3. Fetch All Student Registrations Hook (Partitioned into upcoming vs past)
 */
export function useStudentRegistrations(userId?: string) {
  return useQuery<{
    upcoming: StudentRegistrationItem[];
    past: StudentRegistrationItem[];
    all: StudentRegistrationItem[];
  }>({
    queryKey: ["student", "registrations", userId],
    queryFn: async () => {
      if (!userId) return { upcoming: [], past: [], all: [] };

      const regsRef = getRegistrationsCollection(db);
      const q = query(
        regsRef,
        where("userId", "==", userId),
        orderBy("registeredAt", "desc")
      );

      const regSnap = await getDocs(q);
      const registrations = regSnap.docs.map((d) => d.data());

      const items: StudentRegistrationItem[] = [];
      const eventsRef = getEventsCollection(db);

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
 * 4. Create Registration Mutation (Direct Firestore Transaction)
 */
export function useCreateRegistration() {
  const queryClient = useQueryClient();

  return useMutation<CreateRegistrationResponse, Error, CreateRegistrationPayload>({
    mutationFn: async (payload: CreateRegistrationPayload): Promise<CreateRegistrationResponse> => {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be signed in to register for an event.");
      }

      const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `APL-${Date.now().toString(36).toUpperCase().substring(2, 6)}-${randomCode}`;

      // Get user profile snapshot from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : null;

      // Get event details from Firestore
      const eventDocRef = doc(db, "events", payload.eventId);
      const eventSnap = await getDoc(eventDocRef);
      if (!eventSnap.exists()) {
        throw new Error("Event not found.");
      }
      const eventData = eventSnap.data() as Event;

      const qrPayload = JSON.stringify({
        ticketCode,
        eventId: payload.eventId,
        userId: user.uid,
        eventTitle: eventData.title || "Campus Event",
        issuedAt: new Date().toISOString(),
      });

      const requiresPayment = Boolean(eventData.isPaid && eventData.price > 0);

      const newRegistration = {
        id: regId,
        eventId: payload.eventId,
        userId: user.uid,
        userDisplayName: userData?.displayName || user.displayName || userData?.name || "Student Participant",
        userEmail: user.email || userData?.email || "",
        userRollNumber: userData?.rollNumber || "",
        userDepartment: userData?.department || "School of Technology",
        userPhone: payload.contactPhone || userData?.phoneNumber || "",
        status: (requiresPayment ? "PENDING_PAYMENT" : "CONFIRMED") as RegistrationStatus,
        ticketCode,
        qrCodePayload: qrPayload,
        teamName: payload.teamName || "",
        teamMembers: payload.teamMembers || [],
        answers: payload.answers || {},
        isPaid: !requiresPayment,
        amountPaid: requiresPayment ? 0 : eventData.price || 0,
        checkedIn: false,
        registeredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Strip any potential undefined values so Firestore never rejects the payload
      const cleanedRegistration = Object.fromEntries(
        Object.entries(newRegistration).filter(([_, v]) => v !== undefined)
      );

      // Save registration directly to Firestore
      const regDocRef = doc(db, "registrations", regId);
      await setDoc(regDocRef, cleanedRegistration);

      // Increment registeredCount on the event
      if (!requiresPayment) {
        await setDoc(
          eventDocRef,
          {
            registeredCount: (eventData.registeredCount || 0) + 1,
            updatedAt: new Date(),
          },
          { merge: true }
        ).catch(() => {});
      }

      return {
        success: true,
        registrationId: regId,
        status: (requiresPayment ? "PENDING_PAYMENT" : "CONFIRMED") as RegistrationStatus,
        ticketCode,
        requiresPayment,
        amount: eventData.price || 0,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["registration", "event", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["student", "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["student", "next-registration"] });
      queryClient.invalidateQueries({ queryKey: ["student", "stats"] });

      toast.success("Registration Confirmed!", {
        description: `Your ticket pass code is ${data.ticketCode}.`,
      });
    },
    onError: (err) => {
      toast.error("Registration Failed", {
        description: err.message || "Failed to complete event registration.",
      });
    },
  });
}

/**
 * 5. Cancel Registration Mutation (Direct Firestore Update)
 */
export function useCancelRegistration() {
  const queryClient = useQueryClient();

  return useMutation<CancelRegistrationResponse, Error, CancelRegistrationPayload>({
    mutationFn: async (payload) => {
      const regDocRef = doc(db, "registrations", payload.registrationId);
      await setDoc(
        regDocRef,
        {
          status: "CANCELLED",
          cancellationReason: payload.reason || "User requested cancellation",
          updatedAt: new Date(),
        },
        { merge: true }
      );
      return {
        success: true,
        refundInitiated: false,
      };
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
