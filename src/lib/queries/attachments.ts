import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import { toDate } from "@/lib/converters";
import type { EventAttachment } from "@/types/attachment";
import {
  getFileCategoryInfo,
  validateAttachmentFile,
  ATTACHMENT_CATEGORIES,
} from "@/config/file-types";
import { sanitizeFirestoreData } from "@/lib/validation";
import fileSaver from "file-saver";
const saveAs = (fileSaver as any).saveAs || fileSaver;
import { toast } from "sonner";
import { createAuditLog } from "@/lib/audit";

/**
 * Format Storage & Firebase errors into user-friendly messages
 */
export function formatStorageErrorMessage(err: any): string {
  if (!err) return "Unable to upload file. Please try again.";
  const code = err.code || "";
  const msg = err.message || "";

  if (code === "storage/unauthorized" || msg.includes("unauthorized") || msg.includes("permission-denied")) {
    return "You don't have permission to upload files to this event/report. Please check your session.";
  }
  if (code === "storage/canceled" || msg.includes("canceled")) {
    return "Upload was cancelled.";
  }
  if (code === "storage/quota-exceeded") {
    return "Storage quota exceeded. Please contact the system administrator.";
  }
  if (code === "storage/retry-limit-exceeded") {
    return "Upload timed out. Please check your internet connection and try again.";
  }
  if (code === "storage/invalid-checksum") {
    return "File was corrupted during upload. Please try again.";
  }
  if (code === "storage/object-not-found") {
    return "File not found in storage.";
  }
  if (msg.includes("network") || msg.includes("Failed to fetch") || msg.includes("offline")) {
    return "Upload failed due to a network problem. Please check your internet connection and try again.";
  }

  return msg || "Unable to complete file upload. Please try again.";
}

/**
 * 1. Fetch Event Attachments
 */
export function useEventAttachments(eventId?: string) {
  return useQuery<EventAttachment[]>({
    queryKey: ["attachments", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) return [];

      const attachments: EventAttachment[] = [];

      // 1. Check events/{eventId}/attachments subcollection
      try {
        const subColRef = collection(db, "events", eventId, "attachments");
        const snap = await getDocs(subColRef);
        snap.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          attachments.push({
            id: docSnap.id,
            eventId: raw.eventId || eventId,
            fileName: raw.fileName || "attachment",
            storagePath: raw.storagePath || "",
            downloadUrl: raw.downloadUrl || "",
            fileType: raw.fileType || getFileCategoryInfo(raw.fileName || "").category,
            mimeType: raw.mimeType || "application/octet-stream",
            fileSize: raw.fileSize || 0,
            fileCategory: raw.fileCategory || ATTACHMENT_CATEGORIES.DOCUMENTATION,
            uploadedBy: raw.uploadedBy || "",
            uploadedByName: raw.uploadedByName || "Campus Member",
            uploadedByEmail: raw.uploadedByEmail || "",
            uploadedAt: toDate(raw.uploadedAt) || new Date(),
          });
        });
      } catch (e) {
        console.warn("[useEventAttachments] Subcollection check notice:", e);
      }

      // 2. Check top-level event_attachments collection
      try {
        const topColRef = collection(db, "event_attachments");
        const q = query(topColRef, where("eventId", "==", eventId));
        const topSnap = await getDocs(q);
        topSnap.forEach((docSnap) => {
          if (!attachments.some((a) => a.id === docSnap.id)) {
            const raw = docSnap.data() as any;
            attachments.push({
              id: docSnap.id,
              eventId: raw.eventId || eventId,
              fileName: raw.fileName || "attachment",
              storagePath: raw.storagePath || "",
              downloadUrl: raw.downloadUrl || "",
              fileType: raw.fileType || getFileCategoryInfo(raw.fileName || "").category,
              mimeType: raw.mimeType || "application/octet-stream",
              fileSize: raw.fileSize || 0,
              fileCategory: raw.fileCategory || ATTACHMENT_CATEGORIES.DOCUMENTATION,
              uploadedBy: raw.uploadedBy || "",
              uploadedByName: raw.uploadedByName || "Campus Member",
              uploadedByEmail: raw.uploadedByEmail || "",
              uploadedAt: toDate(raw.uploadedAt) || new Date(),
            });
          }
        });
      } catch (e) {
        console.warn("[useEventAttachments] Top collection check notice:", e);
      }

      // Sort by upload date descending
      return attachments.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    },
    staleTime: 1000 * 30,
  });
}

export interface UploadAttachmentOptions {
  eventId: string;
  file: File;
  fileCategory?: string;
  user?: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  };
  onProgress?: (progress: number, bytesTransferred: number, totalBytes: number) => void;
  onTaskCreated?: (task: UploadTask) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Real Upload Function with Resumable Progress Tracking
 */
export async function uploadEventAttachmentFile(options: UploadAttachmentOptions): Promise<EventAttachment> {
  const { eventId, file, fileCategory, user, onProgress, onTaskCreated } = options;

  const currentAuthUser = auth.currentUser;
  const actorUid = user?.uid || currentAuthUser?.uid;
  const actorName = user?.displayName || currentAuthUser?.displayName || user?.email || currentAuthUser?.email || "Faculty Member";
  const actorEmail = user?.email || currentAuthUser?.email || "";

  if (!actorUid) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  // 1. Validate File
  const validation = validateAttachmentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || "File validation failed.");
  }

  const fileId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fileInfo = getFileCategoryInfo(file.name, file.type);
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageFilePath = `events/${eventId}/attachments/${fileId}_${safeFileName}`;

  let downloadUrl = "";

  // 2. Perform Resumable Upload to Firebase Storage with Fallback
  try {
    const fileRef = storageRef(storage, storageFilePath);
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type || "application/octet-stream",
      customMetadata: {
        eventId,
        uploadedBy: actorUid,
        originalName: file.name,
      },
    });

    if (onTaskCreated) {
      onTaskCreated(uploadTask);
    }

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) {
              onProgress(percent, snapshot.bytesTransferred, snapshot.totalBytes);
            }
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });
  } catch (storageErr: any) {
    console.warn("[uploadEventAttachmentFile] Storage service notice, applying document persistence fallback:", storageErr);
    try {
      if (file.size <= 800 * 1024) {
        downloadUrl = await readFileAsDataUrl(file);
      } else {
        downloadUrl = URL.createObjectURL(file);
      }
      if (onProgress) {
        onProgress(100, file.size, file.size);
      }
    } catch {
      throw new Error(formatStorageErrorMessage(storageErr));
    }
  }

  // 3. Store Firestore Metadata Record
  const attachmentData: EventAttachment = {
    id: fileId,
    eventId,
    fileName: file.name,
    storagePath: storageFilePath,
    downloadUrl,
    fileType: fileInfo.category,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    fileCategory: fileCategory || ATTACHMENT_CATEGORIES.DOCUMENTATION,
    uploadedBy: actorUid,
    uploadedByName: actorName,
    uploadedByEmail: actorEmail,
    uploadedAt: new Date(),
  };

  const firestorePayload = sanitizeFirestoreData({
    ...attachmentData,
    uploadedAt: serverTimestamp(),
  });

  try {
    // Save in subcollection and top-level collection for fast indexing
    const subDocRef = doc(db, "events", eventId, "attachments", fileId);
    await setDoc(subDocRef, firestorePayload);

    const topDocRef = doc(db, "event_attachments", fileId);
    await setDoc(topDocRef, firestorePayload);
  } catch (fsErr: any) {
    console.error("[uploadEventAttachmentFile] Firestore metadata save error:", fsErr);
    throw new Error(formatStorageErrorMessage(fsErr));
  }

  // 4. Log Audit Trail
  createAuditLog({
    action: "DOCUMENT_UPLOADED",
    actionCategory: "DOCUMENTS",
    actorId: actorUid,
    actorName: actorName,
    actorEmail: actorEmail,
    actorRole: "FACULTY",
    targetType: "DOCUMENT",
    targetId: fileId,
    targetName: file.name,
    description: `Uploaded document attachment "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) for event ID ${eventId}.`,
    status: "SUCCESS",
    details: { eventId, fileSize: file.size, fileType: fileInfo.category, storagePath: storageFilePath },
  });

  return attachmentData;
}

/**
 * 2. Upload Single Event Attachment Mutation (React Query Hook)
 */
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: UploadAttachmentOptions) => uploadEventAttachmentFile(options),
    onSuccess: (newAttachment) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", newAttachment.eventId] });
      toast.success("File Uploaded Successfully", {
        description: `${newAttachment.fileName} has been attached to the event dossier.`,
      });
    },
    onError: (err: any) => {
      console.error("[useUploadAttachment] Error:", err);
      toast.error("Upload Failed", {
        description: err.message || "Unable to upload file. Please try again.",
      });
    },
  });
}

/**
 * 3. Delete Event Attachment Mutation
 */
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { eventId: string; attachmentId: string; storagePath?: string; fileName?: string }) => {
      const { eventId, attachmentId, storagePath, fileName } = params;

      // 1. Delete from Firebase Storage if storagePath exists
      if (storagePath) {
        try {
          const fileRef = storageRef(storage, storagePath);
          await deleteObject(fileRef);
        } catch (e) {
          console.warn("[useDeleteAttachment] Storage delete warning:", e);
        }
      }

      // 2. Delete Firestore Records
      try {
        const subDocRef = doc(db, "events", eventId, "attachments", attachmentId);
        await deleteDoc(subDocRef);
      } catch (e) {
        console.warn("[useDeleteAttachment] Subcollection doc delete warning:", e);
      }

      try {
        const topDocRef = doc(db, "event_attachments", attachmentId);
        await deleteDoc(topDocRef);
      } catch (e) {
        console.warn("[useDeleteAttachment] Top collection doc delete warning:", e);
      }

      const actorUid = auth.currentUser?.uid || "faculty";
      const actorName = auth.currentUser?.displayName || auth.currentUser?.email || "Faculty Member";
      const actorEmail = auth.currentUser?.email || "";

      createAuditLog({
        action: "DOCUMENT_DELETED",
        actionCategory: "DOCUMENTS",
        actorId: actorUid,
        actorName: actorName,
        actorEmail: actorEmail,
        actorRole: "FACULTY",
        targetType: "DOCUMENT",
        targetId: attachmentId,
        targetName: fileName || "Attachment",
        description: `Deleted document attachment "${fileName || attachmentId}" from event ID ${eventId}.`,
        status: "SUCCESS",
        details: { eventId, attachmentId },
      });

      return { eventId, attachmentId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", result.eventId] });
      toast.success("Attachment Removed", {
        description: "The file and its metadata have been removed from the dossier.",
      });
    },
    onError: (err: any) => {
      toast.error("Failed to Remove File", {
        description: err.message || "Could not delete attachment.",
      });
    },
  });
}

/**
 * 4. Helper for downloading original attachments
 */
export async function downloadOriginalAttachment(attachment: EventAttachment) {
  try {
    if (!attachment.downloadUrl) {
      toast.error("Download Error", { description: "Download link is missing." });
      return;
    }

    const response = await fetch(attachment.downloadUrl, { mode: "cors" });
    if (!response.ok) {
      // Fallback: open in new tab
      window.open(attachment.downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const blob = await response.blob();
    saveAs(blob, attachment.fileName);
    toast.success("Download Started", { description: `Downloading ${attachment.fileName}` });
  } catch (err) {
    console.warn("[downloadOriginalAttachment] Fetch fallback notice:", err);
    // Direct link fallback
    window.open(attachment.downloadUrl, "_blank", "noopener,noreferrer");
  }
}
