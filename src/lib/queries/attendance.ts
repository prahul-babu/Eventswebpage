import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { playSuccessBeep, playDuplicateBeep, playErrorBeep, triggerHaptic } from "@/lib/audio";
import type { Registration, Event } from "@/types";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export interface CheckInResult {
  success: boolean;
  alreadyCheckedIn: boolean;
  registrationId: string;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  rollNumber?: string;
  department?: string;
  photoURL?: string;
  checkedInAt: string;
  undoSuccessful?: boolean;
}

export interface LiveAttendanceState {
  event: Event | null;
  registrations: Registration[];
  totalConfirmed: number;
  totalAttended: number;
  isLoading: boolean;
}

/**
 * Live onSnapshot Attendance state for an event
 */
export function useLiveEventAttendance(eventId?: string): LiveAttendanceState {
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      setRegistrations([]);
      setIsLoading(false);
      return;
    }

    // 1. Fetch Event Document
    const eventRef = doc(db, "events", eventId);
    getDoc(eventRef).then((snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...(snap.data() as any) });
      }
    });

    // 2. Listen to Registrations Collection for this event
    const regsQuery = query(
      collection(db, "registrations"),
      where("eventId", "==", eventId)
    );

    const unsubscribe = onSnapshot(
      regsQuery,
      (snapshot) => {
        const list: Registration[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any),
        }));
        setRegistrations(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn("[Attendance] Live sync error:", err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  const totalConfirmed = registrations.filter(
    (r) => r.status === "CONFIRMED" || r.status === "ATTENDED"
  ).length;

  const totalAttended = registrations.filter((r) => r.checkedIn || r.status === "ATTENDED").length;

  return {
    event,
    registrations,
    totalConfirmed,
    totalAttended,
    isLoading,
  };
}

/**
 * Mutation: checkInAttendee
 */
export function useCheckInAttendeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      ticketCode,
    }: {
      eventId: string;
      ticketCode: string;
    }): Promise<CheckInResult> => {
      const checkInFn = httpsCallable<
        { eventId: string; ticketCode: string },
        CheckInResult
      >(functions, "checkInAttendee");

      const result = await checkInFn({ eventId, ticketCode });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["event", "registrations"] });

      if (data.alreadyCheckedIn) {
        playDuplicateBeep();
        triggerHaptic("warning");
      } else {
        playSuccessBeep();
        triggerHaptic("success");
      }
    },
    onError: (err: any) => {
      playErrorBeep();
      triggerHaptic("error");
      toast.error("Check-in Failed", { description: err.message });
    },
  });
}

/**
 * Mutation: undoCheckIn
 */
export function useUndoCheckInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      ticketCode,
    }: {
      eventId: string;
      ticketCode: string;
    }): Promise<CheckInResult> => {
      const undoFn = httpsCallable<
        { eventId: string; ticketCode: string; undo: boolean },
        CheckInResult
      >(functions, "checkInAttendee");

      const result = await undoFn({ eventId, ticketCode, undo: true });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["event", "registrations"] });
      toast.success("Check-in Undone", {
        description: `Check-in reverted for ${data.attendeeName}.`,
      });
    },
    onError: (err: any) => {
      toast.error("Undo Failed", { description: err.message });
    },
  });
}
