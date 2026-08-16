import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getEventsCollection } from "@/lib/converters";
import { safeToDate } from "@/lib/utils";
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
export function useUserEventRegistration(eventId?: string, userId?: string | null, userEmail?: string | null) {
  return useQuery<Registration | null>({
    queryKey: ["registration", "event", eventId, userId, userEmail],
    enabled: Boolean(eventId && (userId || userEmail)),
    queryFn: async () => {
      if (!eventId) return null;
      const activeUid = userId || auth.currentUser?.uid;
      const activeEmail = userEmail || auth.currentUser?.email;

      const regsRef = collection(db, "registrations");
      const matchedRegs: Registration[] = [];

      // 1. Check by eventId & userId
      if (activeUid) {
        try {
          const qUid = query(
            regsRef,
            where("eventId", "==", eventId),
            where("userId", "==", activeUid)
          );
          const snapUid = await getDocs(qUid);
          snapUid.docs.forEach((d) => {
            matchedRegs.push({ id: d.id, ...(d.data() as any) } as Registration);
          });
        } catch (err) {
          console.warn("[useUserEventRegistration] UID query notice:", err);
        }
      }

      // 2. Fallback check by eventId & userEmail
      if (matchedRegs.length === 0 && activeEmail) {
        try {
          const qEmail = query(
            regsRef,
            where("eventId", "==", eventId),
            where("userEmail", "==", activeEmail.toLowerCase().trim())
          );
          const snapEmail = await getDocs(qEmail);
          snapEmail.docs.forEach((d) => {
            matchedRegs.push({ id: d.id, ...(d.data() as any) } as Registration);
          });
        } catch (err) {
          console.warn("[useUserEventRegistration] Email query notice:", err);
        }
      }

      if (matchedRegs.length === 0) return null;

      const activeReg = matchedRegs.find((r) => r.status !== "CANCELLED");
      return activeReg || matchedRegs[0];
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export const useEventUserRegistration = useUserEventRegistration;

/**
 * 3. Fetch All Student Registrations Hook (Partitioned into upcoming vs past)
 */
export function useStudentRegistrations(userId?: string, userEmail?: string) {
  return useQuery<{
    upcoming: StudentRegistrationItem[];
    past: StudentRegistrationItem[];
    all: StudentRegistrationItem[];
  }>({
    queryKey: ["student", "registrations", userId, userEmail],
    queryFn: async () => {
      const activeUid = userId || auth.currentUser?.uid;
      const activeEmail = userEmail || auth.currentUser?.email;

      if (!activeUid && !activeEmail) return { upcoming: [], past: [], all: [] };

      const regsRef = collection(db, "registrations");
      const regDocsMap = new Map<string, Registration>();

      // 1. Primary lookup by authenticated UID
      if (activeUid) {
        try {
          const qUid = query(regsRef, where("userId", "==", activeUid));
          const snapUid = await getDocs(qUid);
          snapUid.docs.forEach((d) => {
            regDocsMap.set(d.id, { id: d.id, ...(d.data() as any) } as Registration);
          });
        } catch (err) {
          console.warn("[useStudentRegistrations] UID query notice:", err);
        }
      }

      // 2. Fallback lookup by email if available
      if (activeEmail) {
        try {
          const qEmail = query(regsRef, where("userEmail", "==", activeEmail.toLowerCase().trim()));
          const snapEmail = await getDocs(qEmail);
          snapEmail.docs.forEach((d) => {
            if (!regDocsMap.has(d.id)) {
              regDocsMap.set(d.id, { id: d.id, ...(d.data() as any) } as Registration);
            }
          });
        } catch (err) {
          console.warn("[useStudentRegistrations] Email query notice:", err);
        }
      }

      const rawRegistrations = Array.from(regDocsMap.values());

      // In-memory sorting (avoids composite index requirements)
      rawRegistrations.sort((a, b) => {
        const timeA = safeToDate(a.registeredAt || (a as any).createdAt).getTime();
        const timeB = safeToDate(b.registeredAt || (b as any).createdAt).getTime();
        return timeB - timeA;
      });

      const items: StudentRegistrationItem[] = [];
      const eventsRef = collection(db, "events");

      for (const reg of rawRegistrations) {
        if (!reg.eventId) continue;
        try {
          const eventDocRef = doc(eventsRef, reg.eventId);
          const eventSnap = await getDoc(eventDocRef);
          if (eventSnap.exists()) {
            items.push({ registration: reg, event: { id: eventSnap.id, ...(eventSnap.data() as any) } as Event });
          } else {
            // Handle missing event gracefully
            items.push({
              registration: reg,
              event: {
                id: reg.eventId,
                title: (reg as any).eventTitle || "Campus Event",
                startAt: safeToDate(reg.registeredAt || (reg as any).createdAt),
                endAt: safeToDate(reg.registeredAt || (reg as any).createdAt),
                venueLocation: "Campus Venue",
                category: "Technical",
                status: "PUBLISHED",
                visibility: "PUBLIC",
                price: reg.amountPaid || 0,
                isPaid: Boolean(reg.amountPaid && reg.amountPaid > 0),
                capacity: 100,
                registeredCount: 1,
              } as unknown as Event,
            });
          }
        } catch (err) {
          console.warn("[useStudentRegistrations] Event lookup error:", err);
        }
      }

      const nowTime = new Date().getTime();
      const upcoming = items.filter((i) => {
        if (i.registration.status === "CANCELLED") return false;
        const eventEnd = safeToDate(i.event.endAt || i.event.startAt).getTime();
        return eventEnd >= nowTime;
      });

      const past = items.filter((i) => {
        if (i.registration.status === "CANCELLED") return true;
        const eventEnd = safeToDate(i.event.endAt || i.event.startAt).getTime();
        return eventEnd < nowTime;
      });

      return { upcoming, past, all: items };
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

import { logAuditEvent } from "@/lib/audit";

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

      // Check if user is already registered for this event
      const regsRef = collection(db, "registrations");
      const qExisting = query(
        regsRef,
        where("eventId", "==", payload.eventId),
        where("userId", "==", user.uid)
      );
      const existingSnap = await getDocs(qExisting);
      const activeExisting = existingSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) } as Registration))
        .find((r) => r.status !== "CANCELLED");

      if (activeExisting) {
        return {
          success: true,
          registrationId: activeExisting.id,
          status: activeExisting.status,
          ticketCode: activeExisting.ticketCode || "APL-TICKET",
          requiresPayment: false,
          amount: 0,
        };
      }

      const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `APL-${Date.now().toString(36).toUpperCase().substring(2, 6)}-${randomCode}`;

      // Get user profile snapshot from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : null;

      const userRole = (userData?.role ? String(userData.role).toLowerCase().trim() : null) || (typeof window !== "undefined" ? (localStorage.getItem("apollo_user_role") as string) : null) || "student";

      if (userRole === "faculty" || userRole === "admin") {
        throw new Error(`Event registration is restricted to students. ${userRole.toUpperCase()} accounts manage and oversee campus events.`);
      }

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
        studentUid: user.uid,
        userDisplayName: userData?.displayName || user.displayName || userData?.name || "Student Participant",
        studentName: userData?.displayName || user.displayName || userData?.name || "Student Participant",
        userEmail: user.email || userData?.email || "",
        studentEmail: user.email || userData?.email || "",
        userRollNumber: userData?.rollNumber || "",
        studentRollNumber: userData?.rollNumber || "",
        userDepartment: userData?.btechProgramme || userData?.department || "B.Tech. Computer Science and Engineering",
        userPhone: payload.contactPhone || userData?.phoneNumber || "",
        eventTitle: eventData.title || "Campus Event",
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

      logAuditEvent({
        action: "STUDENT_REGISTERED_EVENT",
        actorUid: user.uid,
        actorName: userData?.displayName || user.displayName || "Student Participant",
        actorEmail: user.email || "",
        actorRole: "STUDENT",
        targetType: "REGISTRATION",
        targetId: regId,
        details: { eventId: payload.eventId, eventTitle: eventData.title, ticketCode },
      });

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
      const regSnap = await getDoc(regDocRef);
      const regData = regSnap.exists() ? regSnap.data() : null;

      await setDoc(
        regDocRef,
        {
          status: "CANCELLED",
          cancellationReason: payload.reason || "User requested cancellation",
          updatedAt: new Date(),
        },
        { merge: true }
      );

      if (regData?.eventId) {
        const eventDocRef = doc(db, "events", regData.eventId);
        const eventSnap = await getDoc(eventDocRef);
        if (eventSnap.exists()) {
          const currentCount = eventSnap.data().registeredCount || 0;
          await setDoc(
            eventDocRef,
            { registeredCount: Math.max(0, currentCount - 1), updatedAt: new Date() },
            { merge: true }
          ).catch(() => {});
        }
      }

      logAuditEvent({
        action: "STUDENT_CANCELLED_REGISTRATION",
        actorUid: auth.currentUser?.uid,
        actorEmail: auth.currentUser?.email || "",
        actorRole: "STUDENT",
        targetType: "REGISTRATION",
        targetId: payload.registrationId,
        details: { eventId: regData?.eventId, ticketCode: regData?.ticketCode },
      });

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
