import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { toDate } from "@/lib/converters";
import type {
  EventUpdate,
  FirestoreEventUpdateDocument,
  SendEventUpdateParams,
  EventUpdateDeliveryResult,
} from "@/types/update";
import type { Registration } from "@/types";
import { sendEventUpdateEmail } from "@/lib/email/emailService";
import { toast } from "sonner";

/**
 * 1. Hook to listen to / fetch all updates for a specific event
 */
export function useEventUpdates(eventId?: string) {
  return useQuery<EventUpdate[]>({
    queryKey: ["event_updates", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) return [];

      try {
        // Try subcollection events/{eventId}/updates
        const updatesRef = collection(db, "events", eventId, "updates");
        const q = query(updatesRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);

        if (!snap.empty) {
          return snap.docs.map((d) => {
            const raw = d.data() as FirestoreEventUpdateDocument;
            return {
              id: d.id,
              eventId: raw.eventId || eventId,
              eventTitle: raw.eventTitle || "",
              senderId: raw.senderId || "",
              senderName: raw.senderName || "Faculty Coordinator",
              senderEmail: raw.senderEmail || "",
              senderRole: raw.senderRole || "Faculty",
              subject: raw.subject || "Event Update",
              message: raw.message || "",
              priority: raw.priority || "NORMAL",
              recipientsCount: raw.recipientsCount ?? 0,
              notificationsCreated: raw.notificationsCreated ?? 0,
              emailsSent: raw.emailsSent ?? 0,
              emailsFailed: raw.emailsFailed ?? 0,
              channels: raw.channels || { inApp: true, email: true },
              createdAt: toDate(raw.createdAt),
              updatedAt: toDate(raw.updatedAt),
            };
          });
        }

        // Fallback: Check top-level event_updates collection
        const topRef = collection(db, "event_updates");
        const topQ = query(
          topRef,
          where("eventId", "==", eventId),
          orderBy("createdAt", "desc")
        );
        const topSnap = await getDocs(topQ);

        return topSnap.docs.map((d) => {
          const raw = d.data() as FirestoreEventUpdateDocument;
          return {
            id: d.id,
            eventId: raw.eventId || eventId,
            eventTitle: raw.eventTitle || "",
            senderId: raw.senderId || "",
            senderName: raw.senderName || "Faculty Coordinator",
            senderEmail: raw.senderEmail || "",
            senderRole: raw.senderRole || "Faculty",
            subject: raw.subject || "Event Update",
            message: raw.message || "",
            priority: raw.priority || "NORMAL",
            recipientsCount: raw.recipientsCount ?? 0,
            notificationsCreated: raw.notificationsCreated ?? 0,
            emailsSent: raw.emailsSent ?? 0,
            emailsFailed: raw.emailsFailed ?? 0,
            channels: raw.channels || { inApp: true, email: true },
            createdAt: toDate(raw.createdAt),
            updatedAt: toDate(raw.updatedAt),
          };
        });
      } catch (err: any) {
        console.error(`[useEventUpdates] Error loading updates for event ${eventId}:`, err);
        return [];
      }
    },
  });
}

/**
 * 2. Hook to dispatch an Event Update to confirmed registered students
 */
export function useSendEventUpdate() {
  const queryClient = useQueryClient();

  return useMutation<EventUpdateDeliveryResult, Error, SendEventUpdateParams>({
    mutationFn: async (params) => {
      const { eventId, subject, message, channels = { inApp: true, email: true }, priority = "NORMAL" } = params;

      if (!auth.currentUser) {
        throw new Error("Authentication required to dispatch event updates.");
      }

      if (!subject.trim() || !message.trim()) {
        throw new Error("Please provide both a subject and announcement message.");
      }

      // Step 1: Fetch Event Details & verify ownership
      const eventDocRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventDocRef);

      if (!eventSnap.exists()) {
        throw new Error("Event not found in repository.");
      }

      const eventData = eventSnap.data() as any;
      const eventTitle = eventData.title || "Campus Event";
      const venueLocation = eventData.venueLocation || "University Campus";
      const eventDate = eventData.startAt ? toDate(eventData.startAt) : new Date();

      const senderId = auth.currentUser.uid;
      const senderEmail = auth.currentUser.email || "";
      const senderName = auth.currentUser.displayName || senderEmail.split("@")[0] || "Faculty Coordinator";

      // Step 2: Query ONLY confirmed / attended registered students for this event
      const regsRef = collection(db, "registrations");
      const regsQuery = query(
        regsRef,
        where("eventId", "==", eventId)
      );
      const regsSnap = await getDocs(regsQuery);

      // Filter for confirmed/attended registrations and deduplicate by user/email
      const confirmedRegistrations: Registration[] = [];
      const seenUserEmails = new Set<string>();

      regsSnap.docs.forEach((docSnap) => {
        const reg = { id: docSnap.id, ...docSnap.data() } as Registration;
        // Accept CONFIRMED, ATTENDED, and valid tickets
        if (reg.status === "CONFIRMED" || reg.status === "ATTENDED" || !reg.status) {
          const email = (reg.userEmail || "").toLowerCase().trim();
          if (email && !seenUserEmails.has(email)) {
            seenUserEmails.add(email);
            confirmedRegistrations.push(reg);
          }
        }
      });

      const recipientsCount = confirmedRegistrations.length;
      const updateId = `upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      let notificationsCreated = 0;
      let emailsSent = 0;
      let emailsFailed = 0;

      // Step 3: Create In-App Notifications in batches
      if (channels.inApp !== false && recipientsCount > 0) {
        const BATCH_SIZE = 450;
        for (let i = 0; i < confirmedRegistrations.length; i += BATCH_SIZE) {
          const chunk = confirmedRegistrations.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);

          chunk.forEach((reg) => {
            const notifId = `notif_${updateId}_${reg.userId || reg.id}`;
            const notifRef = doc(db, "notifications", notifId);

            batch.set(notifRef, {
              id: notifId,
              recipientUid: reg.userId || reg.studentUid || "",
              recipientEmail: reg.userEmail,
              eventId,
              eventTitle,
              eventUpdateId: updateId,
              type: "EVENT_UPDATED",
              title: subject.trim(),
              message: message.trim(),
              body: message.trim(),
              link: `/events/${eventId}`,
              data: {
                eventId,
                eventTitle,
                eventUpdateId: updateId,
                senderName,
                senderRole: "Faculty",
                subject: subject.trim(),
              },
              read: false,
              priority,
              createdAt: serverTimestamp(),
            });

            // Also write to user subcollection if userId exists
            if (reg.userId) {
              const subNotifRef = doc(db, "notifications", reg.userId, "items", notifId);
              batch.set(subNotifRef, {
                id: notifId,
                eventId,
                eventTitle,
                eventUpdateId: updateId,
                type: "EVENT_UPDATED",
                title: subject.trim(),
                body: message.trim(),
                link: `/events/${eventId}`,
                read: false,
                priority,
                createdAt: serverTimestamp(),
              });
            }

            notificationsCreated++;
          });

          await batch.commit();
        }
      }

      // Step 4: Dispatch / Queue Emails for confirmed attendees
      if (channels.email !== false && recipientsCount > 0) {
        await Promise.all(
          confirmedRegistrations.map(async (reg) => {
            try {
              const emailResult = await sendEventUpdateEmail({
                recipientName: reg.userDisplayName || reg.userEmail.split("@")[0],
                recipientEmail: reg.userEmail,
                eventTitle,
                eventId,
                updateSubject: subject.trim(),
                updateMessage: message.trim(),
                eventDate,
                venueLocation,
                senderName,
                senderRole: "Faculty",
              });

              if (emailResult.success) {
                emailsSent++;
              } else {
                emailsFailed++;
              }
            } catch (err) {
              console.error(`[useSendEventUpdate] Email error for ${reg.userEmail}:`, err);
              emailsFailed++;
            }
          })
        );
      }

      // Step 5: Save the EventUpdate Record in both subcollection and top-level index
      const updateData: FirestoreEventUpdateDocument = {
        id: updateId,
        eventId,
        eventTitle,
        senderId,
        senderName,
        senderEmail,
        senderRole: "Faculty",
        subject: subject.trim(),
        message: message.trim(),
        priority,
        recipientsCount,
        notificationsCreated,
        emailsSent,
        emailsFailed,
        channels: {
          inApp: channels.inApp !== false,
          email: channels.email !== false,
        },
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      // Subcollection: events/{eventId}/updates/{updateId}
      const subUpdateRef = doc(db, "events", eventId, "updates", updateId);
      await setDoc(subUpdateRef, updateData);

      // Top-level: event_updates/{updateId}
      const topUpdateRef = doc(db, "event_updates", updateId);
      await setDoc(topUpdateRef, updateData);

      return {
        success: true,
        eventUpdateId: updateId,
        recipientsCount,
        notificationsCreated,
        emailsSent,
        emailsFailed,
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event_updates", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["student", "unread_updates"] });

      toast.success("Event Update Dispatched", {
        description: `Notified ${result.recipientsCount} registered student(s) via In-App & Email.`,
      });
    },
    onError: (err) => {
      toast.error("Failed to Dispatch Update", {
        description: err.message || "An error occurred while broadcasting.",
      });
    },
  });
}

/**
 * 3. Hook to track unread event updates for a student (grouped by eventId)
 */
export function useUnreadUpdatesForStudent(studentUid?: string | null, studentEmail?: string | null) {
  return useQuery<{
    unreadCountByEvent: Record<string, number>;
    totalUnreadUpdates: number;
    unreadNotifications: any[];
  }>({
    queryKey: ["student", "unread_updates", studentUid, studentEmail],
    enabled: Boolean(studentUid || studentEmail),
    queryFn: async () => {
      if (!studentUid && !studentEmail) {
        return { unreadCountByEvent: {}, totalUnreadUpdates: 0, unreadNotifications: [] };
      }

      const notifsRef = collection(db, "notifications");
      let allUnreadDocs: any[] = [];

      if (studentUid) {
        const qUid = query(
          notifsRef,
          where("recipientUid", "==", studentUid),
          where("read", "==", false)
        );
        const snapUid = await getDocs(qUid);
        allUnreadDocs.push(...snapUid.docs);
      }

      if (studentEmail) {
        const qEmail = query(
          notifsRef,
          where("recipientEmail", "==", studentEmail.toLowerCase().trim()),
          where("read", "==", false)
        );
        const snapEmail = await getDocs(qEmail);
        // Deduplicate by doc ID
        const seenIds = new Set(allUnreadDocs.map((d) => d.id));
        snapEmail.docs.forEach((d) => {
          if (!seenIds.has(d.id)) {
            allUnreadDocs.push(d);
          }
        });
      }

      const unreadCountByEvent: Record<string, number> = {};
      const unreadNotifications: any[] = [];

      allUnreadDocs.forEach((d) => {
        const data = d.data();
        if (data.type === "EVENT_UPDATED" || data.type === "EVENT_UPDATE") {
          const eventId = data.eventId || data.data?.eventId;
          if (eventId) {
            unreadCountByEvent[eventId] = (unreadCountByEvent[eventId] || 0) + 1;
          }
          unreadNotifications.push({ id: d.id, ...data });
        }
      });

      return {
        unreadCountByEvent,
        totalUnreadUpdates: unreadNotifications.length,
        unreadNotifications,
      };
    },
  });
}

/**
 * 4. Hook to mark all updates for a specific event as read for the current student
 */
export function useMarkEventUpdatesAsRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { eventId: string; studentUid?: string; studentEmail?: string }>({
    mutationFn: async ({ eventId, studentUid, studentEmail }) => {
      if (!studentUid && !studentEmail) return;

      const notifsRef = collection(db, "notifications");
      const targetDocs: any[] = [];

      if (studentUid) {
        const q = query(
          notifsRef,
          where("recipientUid", "==", studentUid),
          where("eventId", "==", eventId),
          where("read", "==", false)
        );
        const snap = await getDocs(q);
        targetDocs.push(...snap.docs);
      }

      if (studentEmail) {
        const qEmail = query(
          notifsRef,
          where("recipientEmail", "==", studentEmail.toLowerCase().trim()),
          where("eventId", "==", eventId),
          where("read", "==", false)
        );
        const snapEmail = await getDocs(qEmail);
        const seen = new Set(targetDocs.map((d) => d.id));
        snapEmail.docs.forEach((d) => {
          if (!seen.has(d.id)) targetDocs.push(d);
        });
      }

      if (targetDocs.length === 0) return;

      const batch = writeBatch(db);
      targetDocs.forEach((d) => {
        batch.update(d.ref, { read: true });
      });

      await batch.commit();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["student", "unread_updates"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["event_updates", variables.eventId] });
    },
  });
}
