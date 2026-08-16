import type { FirestoreTimestamp } from "./common";

export type AttachmentCategory =
  | "image"
  | "video"
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "document"
  | "other";

export interface EventAttachment {
  id: string;
  eventId: string;
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  fileType: AttachmentCategory;
  mimeType: string;
  fileSize: number; // in bytes
  fileCategory?: string; // e.g. "Photos & Media Highlights", "Attendance & Gate Logs"
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  uploadedAt: Date;
}

export interface FirestoreEventAttachmentDocument {
  id?: string;
  eventId: string;
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  fileType: AttachmentCategory;
  mimeType: string;
  fileSize: number;
  fileCategory?: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  uploadedAt: FirestoreTimestamp;
}
