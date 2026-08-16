import type { FirestoreTimestamp } from "./common";

/**
 * Event Update / Announcement Model
 */
export interface EventUpdate {
  id: string;
  eventId: string;
  eventTitle: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  subject: string;
  message: string;
  priority?: "NORMAL" | "HIGH" | "URGENT";
  recipientsCount: number;
  notificationsCreated: number;
  emailsSent: number;
  emailsFailed: number;
  channels: {
    inApp: boolean;
    email: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore Database representation of Event Update
 */
export interface FirestoreEventUpdateDocument {
  id: string;
  eventId: string;
  eventTitle: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  subject: string;
  message: string;
  priority?: "NORMAL" | "HIGH" | "URGENT";
  recipientsCount: number;
  notificationsCreated: number;
  emailsSent: number;
  emailsFailed: number;
  channels: {
    inApp: boolean;
    email: boolean;
  };
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface SendEventUpdateParams {
  eventId: string;
  subject: string;
  message: string;
  channels?: {
    inApp?: boolean;
    email?: boolean;
  };
  priority?: "NORMAL" | "HIGH" | "URGENT";
}

export interface EventUpdateDeliveryResult {
  success: boolean;
  eventUpdateId: string;
  recipientsCount: number;
  notificationsCreated: number;
  emailsSent: number;
  emailsFailed: number;
}
