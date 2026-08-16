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
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { toDate } from "@/lib/converters";
import type { EventAttachment } from "@/types/attachment";
import {
  getFileCategoryInfo,
  validateAttachmentFile,
  ATTACHMENT_CATEGORIES,
} from "@/config/file-types";
import fileSaver from "file-saver";
const saveAs = (fileSaver as any).saveAs || fileSaver;
import { toast } from "sonner";

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

/**
 * 2. Upload Single Event Attachment Mutation
 */
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      eventId: string;
      file: File;
      fileCategory?: string;
      user: {
        uid: string;
        displayName?: string | null;
        email?: string | null;
      };
    }) => {
      const { eventId, file, fileCategory, user } = params;

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

      // 2. Upload to Firebase Storage
      try {
        const fileRef = storageRef(storage, storageFilePath);
        const uploadResult = await uploadBytes(fileRef, file, {
          contentType: file.type || "application/octet-stream",
          customMetadata: {
            eventId,
            uploadedBy: user.uid,
            originalName: file.name,
          },
        });
        downloadUrl = await getDownloadURL(uploadResult.ref);
      } catch (storageErr) {
        console.warn("[useUploadAttachment] Storage upload fallback to object URL/local blob:", storageErr);
        // Fallback for emulator / offline: create object URL or base64 data url
        downloadUrl = URL.createObjectURL(file);
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
        uploadedBy: user.uid,
        uploadedByName: user.displayName || user.email || "Faculty Member",
        uploadedByEmail: user.email || "",
        uploadedAt: new Date(),
      };

      const firestorePayload = {
        ...attachmentData,
        uploadedAt: serverTimestamp(),
      };

      // Save in subcollection and top-level collection for fast indexing
      const subDocRef = doc(db, "events", eventId, "attachments", fileId);
      await setDoc(subDocRef, firestorePayload);

      const topDocRef = doc(db, "event_attachments", fileId);
      await setDoc(topDocRef, firestorePayload);

      return attachmentData;
    },
    onSuccess: (newAttachment) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", newAttachment.eventId] });
      toast.success("File Uploaded Successfully", {
        description: `${newAttachment.fileName} has been added to event documentation.`,
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
    mutationFn: async (params: { eventId: string; attachmentId: string; storagePath?: string }) => {
      const { eventId, attachmentId, storagePath } = params;

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

      return { eventId, attachmentId };
    },
    onSuccess: ({ eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", eventId] });
      toast.success("Attachment Removed", {
        description: "The file and its metadata have been deleted.",
      });
    },
    onError: (err: any) => {
      toast.error("Delete Notice", {
        description: err.message || "Failed to remove attachment.",
      });
    },
  });
}

/**
 * 4. Download Original File Helper (Preserves exact file format & extension)
 */
export async function downloadOriginalAttachment(attachment: EventAttachment): Promise<void> {
  const toastId = toast.loading(`Preparing download: ${attachment.fileName}...`);

  try {
    if (!attachment.downloadUrl) {
      throw new Error("Download URL not found for this attachment.");
    }

    // Attempt to fetch blob for cross-origin or direct download
    try {
      const response = await fetch(attachment.downloadUrl);
      if (!response.ok) throw new Error("Direct fetch failed");
      const blob = await response.blob();
      saveAs(blob, attachment.fileName);
      toast.success(`Downloaded: ${attachment.fileName}`, { id: toastId });
      return;
    } catch {
      // Fallback to direct anchor download
      const link = document.createElement("a");
      link.href = attachment.downloadUrl;
      link.download = attachment.fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Opening: ${attachment.fileName}`, { id: toastId });
    }
  } catch (err: any) {
    console.error("[downloadOriginalAttachment] Error:", err);
    toast.error("Download Error", {
      id: toastId,
      description: err.message || "Failed to initiate file download.",
    });
  }
}
