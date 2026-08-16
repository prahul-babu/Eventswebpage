import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
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
 * 2. Hook to fetch all event updates grouped by eventId (for Registered Events list)
 */
export function useAllEventsUpdatesMap() {
  return useQuery<Record<string, EventUpdate[]>>({
    queryKey: ["event_updates", "all_map"],
    queryFn: async () => {
      try {
        const topRef = collection(db, "event_updates");
        const topQ = query(topRef, orderBy("createdAt", "desc"), limit(100));
        const snap = await getDocs(topQ);

        const map: Record<string, EventUpdate[]> = {};
        snap.docs.forEach((d) => {
          const raw = d.data() as FirestoreEventUpdateDocument;
          const item: EventUpdate = {
            id: d.id,
            eventId: raw.eventId || "",
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
          if (item.eventId) {
            if (!map[item.eventId]) map[item.eventId] = [];
            map[item.eventId].push(item);
          }
        });
        return map;
      } catch (err) {
        console.warn("[useAllEventsUpdatesMap] Fetch warning:", err);
        return {};
      }
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * 3. Hook to dispatch an Event Update to confirmed registered students
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

      // Verify faculty event ownership authorization
      const userDocRef = doc(db, "users", senderId);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : null;
      const userRole = (
        userData?.role ||
        (typeof window !== "undefined" ? localStorage.getItem("apollo_user_role") : null) ||
        "faculty"
      ).toLowerCase().trim();

      const isOwner =
        eventData.organiserId === senderId ||
        (eventData.organiserEmail && senderEmail && eventData.organiserEmail.toLowerCase() === senderEmail.toLowerCase()) ||
        eventData.createdBy === senderId;
      const isAdmin = userRole === "admin";

      if (!isOwner && !isAdmin) {
        throw new Error("You are not authorized to send updates for this event.");
      }

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
        const status = String(reg.status || "").toUpperCase().trim();
        // Accept CONFIRMED, ATTENDED, ACTIVE, and unassigned status for valid tickets
        if (status === "CONFIRMED" || status === "ATTENDED" || status === "ACTIVE" || !reg.status) {
          const email = (reg.userEmail || (reg as any).studentEmail || "").toLowerCase().trim();
          if (email && !seenUserEmails.has(email)) {
            seenUserEmails.add(email);
            confirmedRegistrations.push(reg);
          }
        }
      });

      const recipientsCount = confirmedRegistrations.length;

      if (recipientsCount === 0) {
        throw new Error("No confirmed students are registered for this event.");
      }

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
            const targetStudentId = reg.userId || (reg as any).studentUid || reg.id;
            const targetStudentEmail = reg.userEmail || (reg as any).studentEmail || "";
            const notifId = `notif_${updateId}_${targetStudentId}`;
            const notifRef = doc(db, "notifications", notifId);

            const notifPayload = {
              id: notifId,
              notificationId: notifId,
              recipientUserId: targetStudentId,
              recipientUid: targetStudentId,
              recipientEmail: targetStudentEmail,
              recipientRole: "student",
              eventId,
              eventTitle,
              eventName: eventTitle,
              eventUpdateId: updateId,
              senderUserId: senderId,
              senderUid: senderId,
              senderRole: "FACULTY",
              senderName,
              type: "EVENT_UPDATE",
              title: subject.trim(),
              subject: subject.trim(),
              message: message.trim(),
              body: message.trim(),
              link: `/events/${eventId}#updates`,
              data: {
                eventId,
                eventTitle,
                eventUpdateId: updateId,
                senderName,
                senderRole: "Faculty",
                subject: subject.trim(),
              },
              read: false,
              isRead: false,
              priority,
              inAppStatus: "sent",
              emailStatus: channels.email !== false ? "queued" : "skipped",
              createdAt: serverTimestamp(),
            };

            batch.set(notifRef, notifPayload);

            // Also write to user subcollection if student ID exists
            if (targetStudentId) {
              const subNotifRef = doc(db, "notifications", targetStudentId, "items", notifId);
              batch.set(subNotifRef, notifPayload);
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
            const studentEmail = reg.userEmail || (reg as any).studentEmail || "";
            if (!studentEmail) return;

            try {
              const emailResult = await sendEventUpdateEmail({
                recipientName: reg.userDisplayName || (reg as any).studentName || studentEmail.split("@")[0],
                recipientEmail: studentEmail,
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
              console.error(`[useSendEventUpdate] Email dispatch error for ${studentEmail}:`, err);
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

      // Step 6: Record Audit Log Entry
      try {
        await addDoc(collection(db, "audit_logs"), {
          action: "EVENT_BROADCAST_SENT",
          actorUid: senderId,
          actorEmail: senderEmail,
          actorRole: "faculty",
          targetEventId: eventId,
          eventTitle,
          details: {
            subject: subject.trim(),
            recipientsCount,
            notificationsCreated,
            emailsSent,
            emailsFailed,
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("[useSendEventUpdate] Audit log write warning:", auditErr);
      }

      return {
        success: true,
        eventUpdateId: updateId,
        recipientsCount,
        notificationsCreated,
        emailsSent,
        emailsFailed,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event_updates", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event_updates", "all_map"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["student", "unread_updates"] });
    },
    onError: (err) => {
      toast.error("Failed to Dispatch Broadcast", {
        description: err.message || "An error occurred while broadcasting.",
      });
    },
  });
}

/**
 * 4. Hook to track unread event updates for a student (grouped by eventId)
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
        const t = data.type;
        if (t === "EVENT_UPDATE" || t === "EVENT_UPDATED" || t === "FACULTY_EVENT_UPDATE") {
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
 * 5. Hook to mark all updates for a specific event as read for the current student
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
        batch.update(d.ref, { read: true, isRead: true, readAt: new Date() });
      });

      await batch.commit();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["student", "unread_updates"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["event_updates", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event_updates", "all_map"] });
    },
  });
}
