import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getEventsCollection, getRegistrationsCollection, getEventDoc } from "@/lib/converters";
import { safeToDate } from "@/lib/utils";
import type { Event, Registration, EventCategory, EventVenueType } from "@/types";

export interface EventFilters {
  searchQuery?: string;
  categories?: EventCategory[];
  venueType?: EventVenueType | "ALL";
  pricing?: "ALL" | "FREE" | "PAID";
  datePreset?: "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "UPCOMING";
  sortBy?: "START_DATE_ASC" | "START_DATE_DESC" | "POPULARITY" | "PRICE_ASC";
}

/**
 * 0. Single Event Detail Hook
 */
export function useEventDetail(eventId?: string) {
  return useQuery<Event | null>({
    queryKey: ["event", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) return null;
      const eventDocRef = getEventDoc(db, eventId);
      const snap = await getDoc(eventDocRef);
      if (!snap.exists()) return null;
      return snap.data();
    },
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * 1. Live Ongoing Events Hook (Real-time onSnapshot)
 * Powers the "Happening Now" horizontal strip on the Student Home page.
 */
export function useOngoingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const eventsRef = getEventsCollection(db);
    const q = query(
      eventsRef,
      where("status", "==", "ONGOING")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveEvents = snapshot.docs
          .map((d) => d.data())
          .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
          .slice(0, 10);
        setEvents(liveEvents);
        setIsLoading(false);
      },
      (err) => {
        console.warn("[useOngoingEvents] onSnapshot notice:", err.message);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { events, isLoading, error };
}

/**
 * 2. Upcoming Published Events Hook (TanStack Query)
 * Returns the next upcoming published events for student home preview.
 */
export function useUpcomingEvents(limitCount = 6) {
  return useQuery<Event[]>({
    queryKey: ["events", "upcoming", limitCount],
    queryFn: async () => {
      const eventsRef = getEventsCollection(db);
      const now = new Date();

      try {
        const q = query(
          eventsRef,
          where("status", "in", ["PUBLISHED", "ONGOING"]),
          where("startAt", ">=", Timestamp.fromDate(now)),
          orderBy("startAt", "asc"),
          limit(limitCount)
        );

        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data());
      } catch (err) {
        console.warn("[useUpcomingEvents] Primary query fallback to status filter:", err);
        const fallbackQ = query(
          eventsRef,
          where("status", "in", ["PUBLISHED", "ONGOING"]),
          limit(limitCount * 2)
        );
        const fallbackSnap = await getDocs(fallbackQ);
        return fallbackSnap.docs
          .map((d) => d.data())
          .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
          .slice(0, limitCount);
      }
    },
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * 3. Filtered Events Hook
 */
export function usePublishedEvents(filters: EventFilters) {
  return useQuery<Event[]>({
    queryKey: ["events", "published", filters],
    queryFn: async () => {
      const eventsRef = getEventsCollection(db);
      
      const q = query(
        eventsRef,
        where("status", "in", ["PUBLISHED", "ONGOING"]),
        limit(100)
      );

      const snap = await getDocs(q);
      let list = snap.docs.map((d) => d.data());

      // Client-side multi-attribute search and filtering
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const term = filters.searchQuery.trim().toLowerCase();
        list = list.filter(
          (e) =>
            e.title.toLowerCase().includes(term) ||
            e.description.toLowerCase().includes(term) ||
            e.organiserName.toLowerCase().includes(term) ||
            e.venueLocation.toLowerCase().includes(term) ||
            (e.tags && e.tags.some((t) => t.toLowerCase().includes(term)))
        );
      }

      if (filters.categories && filters.categories.length > 0) {
        list = list.filter((e) => filters.categories!.includes(e.category));
      }

      if (filters.venueType && filters.venueType !== "ALL") {
        list = list.filter((e) => e.venueType === filters.venueType);
      }

      if (filters.pricing && filters.pricing !== "ALL") {
        if (filters.pricing === "FREE") {
          list = list.filter((e) => !e.isPaid || e.price === 0);
        } else if (filters.pricing === "PAID") {
          list = list.filter((e) => e.isPaid && e.price > 0);
        }
      }

      if (filters.datePreset && filters.datePreset !== "ALL") {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        if (filters.datePreset === "TODAY") {
          list = list.filter((e) => e.startAt >= startOfToday && e.startAt <= endOfToday);
        } else if (filters.datePreset === "THIS_WEEK") {
          const endOfWeek = new Date(startOfToday);
          endOfWeek.setDate(endOfWeek.getDate() + 7);
          list = list.filter((e) => e.startAt >= startOfToday && e.startAt <= endOfWeek);
        } else if (filters.datePreset === "THIS_MONTH") {
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          list = list.filter((e) => e.startAt >= startOfToday && e.startAt <= endOfMonth);
        } else if (filters.datePreset === "UPCOMING") {
          list = list.filter((e) => e.startAt >= startOfToday);
        }
      }

      // Sorting
      if (filters.sortBy === "START_DATE_DESC") {
        list.sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
      } else if (filters.sortBy === "POPULARITY") {
        list.sort((a, b) => b.registeredCount - a.registeredCount);
      } else if (filters.sortBy === "PRICE_ASC") {
        list.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else {
        list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      }

      return list;
    },
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * 4. Upcoming User Registrations Hook (Used on student dashboard to show next event pass)
 */
export function useUpcomingRegistrations(userId?: string | null) {
  return useQuery<{ registration: Registration; event: Event } | null>({
    queryKey: ["student", "next-registration", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;

      const regsRef = getRegistrationsCollection(db);
      const q = query(
        regsRef,
        where("userId", "==", userId),
        where("status", "==", "CONFIRMED"),
        limit(20)
      );

      const snap = await getDocs(q);
      if (snap.empty) return null;

      const registrations = snap.docs.map((d) => d.data());
      const eventsRef = getEventsCollection(db);

      const upcomingRegs: { registration: Registration; event: Event }[] = [];

      for (const reg of registrations) {
        const eventDocRef = query(eventsRef, where("__name__", "==", reg.eventId));
        const eventSnap = await getDocs(eventDocRef);
        if (!eventSnap.empty) {
          const eventData = eventSnap.docs[0].data();
          const eventStartTime = safeToDate(eventData.startAt).getTime();
          if (eventStartTime >= Date.now() - 1000 * 60 * 60 * 2) {
            upcomingRegs.push({ registration: reg, event: eventData });
          }
        }
      }

      if (upcomingRegs.length === 0) return null;

      upcomingRegs.sort((a, b) => safeToDate(a.event.startAt).getTime() - safeToDate(b.event.startAt).getTime());
      return upcomingRegs[0];
    },
    staleTime: 1000 * 60 * 3,
  });
}

export const useNextStudentRegistration = useUpcomingRegistrations;

/**
 * 5. Student Registration & Attendance Stats Hook
 */
export function useStudentStats(userId?: string | null) {
  return useQuery<{ registeredCount: number; attendedCount: number }>({
    queryKey: ["student", "stats", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return { registeredCount: 0, attendedCount: 0 };

      const regsRef = getRegistrationsCollection(db);
      const q = query(regsRef, where("userId", "==", userId));
      const snap = await getDocs(q);

      const registeredCount = snap.docs.filter((d) => d.data().status === "CONFIRMED").length;
      const attendedCount = snap.docs.filter((d) => d.data().checkedIn === true).length;

      return { registeredCount, attendedCount };
    },
    staleTime: 1000 * 60 * 5,
  });
}
