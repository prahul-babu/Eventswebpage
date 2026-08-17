import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  increment,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  EventStatus,
  EventCategory,
  EventVenueType,
} from "@/types";
import {
  isValidOptionalPhoneNumber,
  isValidEmail,
  sanitizeFirestoreData,
  PHONE_ERROR_MESSAGES,
} from "@/lib/validation";
import { toast } from "sonner";

export interface EventAuditLogItem {
  id: string;
  action: string;
  actorUid?: string;
  actorEmail?: string;
  actorRole?: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface AdminEventFormPayload {
  title: string;
  shortSummary?: string;
  description: string;
  category: EventCategory;
  venueType: EventVenueType;
  venueLocation: string;
  roomBuilding?: string;
  startAt: Date | string;
  endAt: Date | string;
  registrationStartAt?: Date | string;
  registrationDeadline: Date | string;
  cancellationDeadline?: Date | string;
  capacity: number;
  allowWaitlist?: boolean;
  maxTeamSize?: number;
  isPaid: boolean;
  price?: number;
  currency?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  gallery?: string[];
  tags?: string[];
  eligibility?: string;
  targetAudience?: string;
  yearRestrictions?: string[];
  departmentRestrictions?: string[];
  prerequisites?: string;
  externalLink?: string;
  organiserName: string;
  organiserEmail: string;
  organiserPhone?: string;
  facultyCoordinator?: string;
  studentCoordinators?: string;
  department?: string;
  school?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  instructions?: string;
  termsAndConditions?: string;
  budgetAllocated?: number;
  amountSpent?: number;
  status?: EventStatus;
  isFeatured?: boolean;
}

/**
 * 1. Admin Edit Event Mutation
 */
export function useAdminEditEvent() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; eventId: string; title: string },
    Error,
    { eventId: string; data: AdminEventFormPayload }
  >({
    mutationFn: async ({ eventId, data }) => {
      if (!eventId) throw new Error("Event ID is required.");

      // Validate required fields
      if (!data.title?.trim() || data.title.trim().length < 3) {
        throw new Error("Event title must be at least 3 characters.");
      }
      if (!data.description?.trim() || data.description.trim().length < 10) {
        throw new Error("Event description must be at least 10 characters.");
      }
      if (!data.venueLocation?.trim()) {
        throw new Error("Venue location is required.");
      }
      if (!data.startAt || !data.endAt) {
        throw new Error("Start date and End date are required.");
      }

      const startDate = new Date(data.startAt);
      const endDate = new Date(data.endAt);
      if (endDate <= startDate) {
        throw new Error("Event end date/time must be after start date/time.");
      }

      const regDeadline = data.registrationDeadline ? new Date(data.registrationDeadline) : startDate;
      if (data.registrationStartAt) {
        const regStart = new Date(data.registrationStartAt);
        if (regDeadline < regStart) {
          throw new Error("Registration closing date cannot be earlier than registration start date.");
        }
      }

      if (data.capacity < 1) {
        throw new Error("Event capacity must be at least 1 seat.");
      }

      if (data.isPaid && (data.price === undefined || data.price < 0)) {
        throw new Error("Price for paid event must be a non-negative amount.");
      }

      if (data.organiserPhone?.trim() && !isValidOptionalPhoneNumber(data.organiserPhone)) {
        throw new Error(`Organizer phone: ${PHONE_ERROR_MESSAGES.INVALID}`);
      }
      if (data.contactPhone?.trim() && !isValidOptionalPhoneNumber(data.contactPhone)) {
        throw new Error(`Contact phone: ${PHONE_ERROR_MESSAGES.INVALID}`);
      }
      if (data.contactEmail?.trim() && !isValidEmail(data.contactEmail)) {
        throw new Error("Contact email format is invalid.");
      }

      const eventRef = doc(db, "events", eventId);
      const prevSnap = await getDoc(eventRef);
      if (!prevSnap.exists()) {
        throw new Error("Event does not exist.");
      }
      const prevData = prevSnap.data();

      const allocated = Number(data.budgetAllocated) || 0;
      const spent = Number(data.amountSpent) || 0;
      const balanceRemaining = Math.max(0, allocated - spent);

      const rawUpdates: Record<string, any> = {
        title: data.title.trim(),
        shortSummary: data.shortSummary?.trim() || "",
        description: data.description.trim(),
        category: data.category,
        venueType: data.venueType,
        venueLocation: data.venueLocation.trim(),
        roomBuilding: data.roomBuilding?.trim() || "",
        startAt: startDate,
        endAt: endDate,
        registrationStartAt: data.registrationStartAt ? new Date(data.registrationStartAt) : null,
        registrationDeadline: regDeadline,
        cancellationDeadline: data.cancellationDeadline ? new Date(data.cancellationDeadline) : null,
        capacity: Number(data.capacity),
        allowWaitlist: Boolean(data.allowWaitlist),
        maxTeamSize: Number(data.maxTeamSize) || 1,
        isPaid: Boolean(data.isPaid),
        price: data.isPaid ? Number(data.price) || 0 : 0,
        currency: data.currency || "INR",
        bannerUrl: data.bannerUrl || prevData.bannerUrl || "",
        thumbnailUrl: data.thumbnailUrl || data.bannerUrl || "",
        gallery: data.gallery || [],
        tags: data.tags || [],
        eligibility: data.eligibility?.trim() || "",
        targetAudience: data.targetAudience?.trim() || "",
        yearRestrictions: data.yearRestrictions || [],
        departmentRestrictions: data.departmentRestrictions || [],
        prerequisites: data.prerequisites?.trim() || "",
        externalLink: data.externalLink?.trim() || "",
        organiserName: data.organiserName?.trim() || prevData.organiserName || "Apollo Faculty",
        organiserEmail: data.organiserEmail?.trim() || prevData.organiserEmail || "faculty@apollouniversity.edu.in",
        organiserPhone: data.organiserPhone?.trim() || "",
        facultyCoordinator: data.facultyCoordinator?.trim() || "",
        studentCoordinators: data.studentCoordinators?.trim() || "",
        department: data.department?.trim() || prevData.department || "Computer Science and Engineering",
        school: data.school?.trim() || prevData.school || "School of Technology",
        contactPerson: data.contactPerson?.trim() || "",
        contactEmail: data.contactEmail?.trim() || "",
        contactPhone: data.contactPhone?.trim() || "",
        instructions: data.instructions?.trim() || "",
        termsAndConditions: data.termsAndConditions?.trim() || "",
        budgetAllocated: allocated,
        amountSpent: spent,
        balanceRemaining: balanceRemaining,
        isFeatured: Boolean(data.isFeatured),
        updatedAt: new Date(),
      };

      if (data.status) {
        rawUpdates.status = data.status;
      }

      const sanitizedUpdates = sanitizeFirestoreData(rawUpdates);
      await updateDoc(eventRef, sanitizedUpdates);

      // Audit Logging
      try {
        const actorUid = auth.currentUser?.uid || "admin-system";
        const actorEmail = auth.currentUser?.email || "admin@apollo.edu.in";
        await addDoc(collection(db, "audit_logs"), {
          action: "EVENT_EDITED",
          actorUid,
          actorEmail,
          actorRole: "admin",
          targetId: eventId,
          targetType: "EVENT",
          targetName: data.title.trim(),
          details: {
            eventId,
            title: data.title.trim(),
            status: data.status || prevData.status,
            capacity: Number(data.capacity),
            department: data.department || prevData.department,
            venueLocation: data.venueLocation.trim(),
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("[useAdminEditEvent] Audit log failed:", auditErr);
      }

      return { success: true, eventId, title: data.title.trim() };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "all-events"] });
      queryClient.invalidateQueries({ queryKey: ["event", res.eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event Updated Successfully", {
        description: `"${res.title}" has been updated in the institutional registry.`,
      });
    },
    onError: (err) => {
      toast.error("Failed to Update Event", { description: err.message });
    },
  });
}

/**
 * 2. Admin Change Event Status Mutation
 */
export function useAdminChangeEventStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; eventId: string; prevStatus: EventStatus; newStatus: EventStatus },
    Error,
    { eventId: string; newStatus: EventStatus; reason?: string }
  >({
    mutationFn: async ({ eventId, newStatus, reason }) => {
      if (!eventId) throw new Error("Event ID is required.");
      const eventRef = doc(db, "events", eventId);
      const snap = await getDoc(eventRef);
      if (!snap.exists()) throw new Error("Event does not exist.");

      const eventData = snap.data();
      const prevStatus = eventData.status as EventStatus;

      const updates: Record<string, any> = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === "PUBLISHED" && !eventData.approvedAt) {
        updates.approvedAt = new Date();
        updates.approvedBy = auth.currentUser?.email || "Admin";
      }

      if (reason) {
        updates.statusChangeReason = reason.trim();
      }

      await updateDoc(eventRef, sanitizeFirestoreData(updates));

      // Record Audit Log
      try {
        const actorUid = auth.currentUser?.uid || "admin-system";
        const actorEmail = auth.currentUser?.email || "admin@apollo.edu.in";
        await addDoc(collection(db, "audit_logs"), {
          action: "EVENT_STATUS_CHANGED",
          actorUid,
          actorEmail,
          actorRole: "admin",
          targetId: eventId,
          targetType: "EVENT",
          targetName: eventData.title,
          details: {
            eventId,
            title: eventData.title,
            prevStatus,
            newStatus,
            reason: reason || "Administrative status transition",
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("[useAdminChangeEventStatus] Audit log error:", auditErr);
      }

      return { success: true, eventId, prevStatus, newStatus };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "all-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["event", res.eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event Status Changed", {
        description: `Status updated from ${res.prevStatus} to ${res.newStatus}.`,
      });
    },
    onError: (err) => {
      toast.error("Failed to Change Status", { description: err.message });
    },
  });
}

/**
 * 3. Admin Duplicate Event Mutation
 */
export function useAdminDuplicateEvent() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; newEventId: string; title: string },
    Error,
    { sourceEventId: string; customTitle?: string }
  >({
    mutationFn: async ({ sourceEventId, customTitle }) => {
      const sourceRef = doc(db, "events", sourceEventId);
      const snap = await getDoc(sourceRef);
      if (!snap.exists()) throw new Error("Source event not found.");

      const sourceData = snap.data();
      const newTitle = customTitle?.trim() || `Copy of ${sourceData.title}`;

      const newEventPayload: Record<string, any> = {
        ...sourceData,
        title: newTitle,
        status: "DRAFT",
        registeredCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedAt: null,
        approvedBy: null,
        rejectionReason: null,
        statusChangeReason: null,
      };

      // Ensure no registrations, payments, or reports are copied
      delete newEventPayload.id;

      const sanitizedPayload = sanitizeFirestoreData(newEventPayload);
      const newDocRef = await addDoc(collection(db, "events"), sanitizedPayload);

      // Audit log
      try {
        const actorUid = auth.currentUser?.uid || "admin-system";
        const actorEmail = auth.currentUser?.email || "admin@apollo.edu.in";
        await addDoc(collection(db, "audit_logs"), {
          action: "EVENT_DUPLICATED",
          actorUid,
          actorEmail,
          actorRole: "admin",
          targetId: newDocRef.id,
          targetType: "EVENT",
          targetName: newTitle,
          details: {
            sourceEventId,
            newEventId: newDocRef.id,
            title: newTitle,
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("[useAdminDuplicateEvent] Audit log error:", auditErr);
      }

      return { success: true, newEventId: newDocRef.id, title: newTitle };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "all-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event Duplicated", {
        description: `Created "${res.title}" as a new DRAFT.`,
      });
    },
    onError: (err) => {
      toast.error("Failed to Duplicate Event", { description: err.message });
    },
  });
}

/**
 * 4. Admin Manual Student Registration Mutation
 */
export function useAdminManualRegisterStudent() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; registrationId: string; ticketCode: string; studentName: string },
    Error,
    {
      eventId: string;
      studentUid: string;
      studentName: string;
      studentEmail: string;
      studentRollNumber?: string;
      studentDepartment?: string;
      studentPhone?: string;
      customAnswers?: Record<string, any>;
    }
  >({
    mutationFn: async (payload) => {
      const eventRef = doc(db, "events", payload.eventId);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) throw new Error("Event does not exist.");

      const eventData = eventSnap.data();

      // Check if student is already registered
      const regsRef = collection(db, "registrations");
      const qExisting = query(
        regsRef,
        where("eventId", "==", payload.eventId),
        where("userId", "==", payload.studentUid)
      );
      const snapExisting = await getDocs(qExisting);
      const activeExisting = snapExisting.docs.find((d) => d.data().status !== "CANCELLED");
      if (activeExisting) {
        throw new Error("This student is already actively registered for this event.");
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `APOLLO-${(eventData.category || "EVT").slice(0, 3).toUpperCase()}-${randomSuffix}`;

      const regData = sanitizeFirestoreData({
        eventId: payload.eventId,
        eventTitle: eventData.title,
        eventStartAt: eventData.startAt,
        eventVenue: eventData.venueLocation,
        userId: payload.studentUid,
        userDisplayName: payload.studentName.trim(),
        userEmail: payload.studentEmail.trim(),
        userRollNumber: payload.studentRollNumber?.trim() || "",
        userDepartment: payload.studentDepartment?.trim() || "General",
        userPhone: payload.studentPhone?.trim() || "",
        ticketCode,
        status: "CONFIRMED",
        checkedIn: false,
        checkedInAt: null,
        isPaid: Boolean(eventData.isPaid),
        amountPaid: eventData.isPaid ? Number(eventData.price) || 0 : 0,
        registeredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        customAnswers: payload.customAnswers || {},
        registeredByAdmin: true,
      });

      const newRegRef = await addDoc(regsRef, regData);

      // Increment registeredCount on event
      await updateDoc(eventRef, {
        registeredCount: increment(1),
        updatedAt: new Date(),
      });

      // Audit Log
      try {
        const actorUid = auth.currentUser?.uid || "admin-system";
        const actorEmail = auth.currentUser?.email || "admin@apollo.edu.in";
        await addDoc(collection(db, "audit_logs"), {
          action: "REGISTRATION_CREATED",
          actorUid,
          actorEmail,
          actorRole: "admin",
          targetId: newRegRef.id,
          targetType: "REGISTRATION",
          targetName: payload.studentName.trim(),
          details: {
            eventId: payload.eventId,
            eventTitle: eventData.title,
            studentUid: payload.studentUid,
            ticketCode,
            manualAdminEntry: true,
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("[useAdminManualRegisterStudent] Audit log error:", auditErr);
      }

      return {
        success: true,
        registrationId: newRegRef.id,
        ticketCode,
        studentName: payload.studentName.trim(),
      };
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["event_registrants", vars.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", vars.eventId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-events"] });
      toast.success("Student Registered Successfully", {
        description: `Issued pass ${res.ticketCode} for ${res.studentName}.`,
      });
    },
    onError: (err) => {
      toast.error("Registration Failed", { description: err.message });
    },
  });
}

/**
 * 5. Admin Cancel Registration Mutation
 */
export function useAdminCancelRegistration() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; registrationId: string; eventId: string },
    Error,
    { registrationId: string; eventId: string; reason?: string }
  >({
    mutationFn: async ({ registrationId, eventId, reason }) => {
      const regRef = doc(db, "registrations", registrationId);
      const regSnap = await getDoc(regRef);
      if (!regSnap.exists()) throw new Error("Registration record not found.");

      const regData = regSnap.data();

      await updateDoc(regRef, {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason || "Cancelled by university administration",
        updatedAt: new Date(),
      });

      // Decrement event registered count if it was confirmed
      if (regData.status === "CONFIRMED" || regData.status === "ATTENDED") {
        const eventRef = doc(db, "events", eventId);
        await updateDoc(eventRef, {
          registeredCount: increment(-1),
          updatedAt: new Date(),
        });
      }

      // Audit Log
      try {
        const actorUid = auth.currentUser?.uid || "admin-system";
        const actorEmail = auth.currentUser?.email || "admin@apollo.edu.in";
        await addDoc(collection(db, "audit_logs"), {
          action: "REGISTRATION_CANCELLED",
          actorUid,
          actorEmail,
          actorRole: "admin",
          targetId: registrationId,
          targetType: "REGISTRATION",
          targetName: regData.userDisplayName || "Attendee",
          details: {
            eventId,
            registrationId,
            studentUid: regData.userId,
            ticketCode: regData.ticketCode,
            reason: reason || "Cancelled by Admin",
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("[useAdminCancelRegistration] Audit log error:", auditErr);
      }

      return { success: true, registrationId, eventId };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["event_registrants", res.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", res.eventId] });
      toast.success("Registration Cancelled");
    },
    onError: (err) => {
      toast.error("Failed to Cancel Registration", { description: err.message });
    },
  });
}

/**
 * 6. Admin Restore Cancelled Registration Mutation
 */
export function useAdminRestoreRegistration() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; registrationId: string; eventId: string },
    Error,
    { registrationId: string; eventId: string }
  >({
    mutationFn: async ({ registrationId, eventId }) => {
      const regRef = doc(db, "registrations", registrationId);
      const regSnap = await getDoc(regRef);
      if (!regSnap.exists()) throw new Error("Registration record not found.");

      const regData = regSnap.data();

      await updateDoc(regRef, {
        status: "CONFIRMED",
        cancelledAt: null,
        cancellationReason: null,
        updatedAt: new Date(),
      });

      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        registeredCount: increment(1),
        updatedAt: new Date(),
      });

      // Audit Log
      try {
        const actorUid = auth.currentUser?.uid || "admin-system";
        const actorEmail = auth.currentUser?.email || "admin@apollo.edu.in";
        await addDoc(collection(db, "audit_logs"), {
          action: "REGISTRATION_RESTORED",
          actorUid,
          actorEmail,
          actorRole: "admin",
          targetId: registrationId,
          targetType: "REGISTRATION",
          targetName: regData.userDisplayName || "Attendee",
          details: {
            eventId,
            registrationId,
            ticketCode: regData.ticketCode,
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("[useAdminRestoreRegistration] Audit log error:", auditErr);
      }

      return { success: true, registrationId, eventId };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["event_registrants", res.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", res.eventId] });
      toast.success("Registration Restored", { description: "Pass marked as CONFIRMED." });
    },
    onError: (err) => {
      toast.error("Failed to Restore Registration", { description: err.message });
    },
  });
}

/**
 * 7. Admin Bulk Attendance Mutation
 */
export function useAdminBulkAttendance() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; eventId: string; count: number; markAs: boolean },
    Error,
    { eventId: string; registrationIds: string[]; markAs: boolean }
  >({
    mutationFn: async ({ eventId, registrationIds, markAs }) => {
      if (registrationIds.length === 0) return { success: true, eventId, count: 0, markAs };

      const batch = writeBatch(db);
      const now = new Date();

      registrationIds.forEach((regId) => {
        const ref = doc(db, "registrations", regId);
        batch.update(ref, {
          checkedIn: markAs,
          checkedInAt: markAs ? now : null,
          checkInMethod: markAs ? "ADMIN_BULK" : null,
          updatedAt: now,
        });
      });

      await batch.commit();

      // Audit Log
      try {
        const actorUid = auth.currentUser?.uid || "admin-system";
        const actorEmail = auth.currentUser?.email || "admin@apollo.edu.in";
        await addDoc(collection(db, "audit_logs"), {
          action: "ATTENDANCE_MARKED",
          actorUid,
          actorEmail,
          actorRole: "admin",
          targetId: eventId,
          targetType: "EVENT",
          details: {
            eventId,
            count: registrationIds.length,
            markedAs: markAs ? "PRESENT" : "ABSENT",
          },
          timestamp: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("[useAdminBulkAttendance] Audit log error:", auditErr);
      }

      return { success: true, eventId, count: registrationIds.length, markAs };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["event_registrants", res.eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", res.eventId] });
      toast.success("Bulk Attendance Updated", {
        description: `Marked ${res.count} attendees as ${res.markAs ? "PRESENT" : "ABSENT"}.`,
      });
    },
    onError: (err) => {
      toast.error("Failed to Update Attendance", { description: err.message });
    },
  });
}

/**
 * 8. Query Event Audit Logs
 */
export function useEventAuditLogs(eventId?: string) {
  return useQuery<EventAuditLogItem[]>({
    queryKey: ["admin", "audit_logs", "event", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) return [];

      const logsRef = collection(db, "audit_logs");
      const q = query(logsRef, where("targetId", "==", eventId));
      const snap = await getDocs(q);

      return snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date(),
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) as EventAuditLogItem[];
    },
    staleTime: 1000 * 30,
  });
}
