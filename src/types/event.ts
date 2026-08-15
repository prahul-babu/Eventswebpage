import type { FirestoreTimestamp } from "./common";
import type { UserRole } from "./user";

// Event Categories
export const EVENT_CATEGORIES = [
  "ACADEMIC",
  "WORKSHOP",
  "CULTURAL",
  "SPORTS",
  "SEMINAR",
  "HACKATHON",
  "GUEST_LECTURE",
  "CONFERENCE",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

// Event Lifecycle Statuses
export const EVENT_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

// Event Delivery Modes / Venues
export const EVENT_VENUE_TYPES = ["ON_CAMPUS", "ONLINE", "HYBRID"] as const;
export type EventVenueType = (typeof EVENT_VENUE_TYPES)[number];

/**
 * Custom Question Schema defined by event organizers
 */
export interface CustomQuestion {
  id: string;
  label: string;
  type: "text" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

/**
 * Application-level Event model (Dates mapped to JavaScript Date)
 */
export interface Event {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  
  venueType: EventVenueType;
  venueLocation: string; // e.g. "Auditorium Block A" or Zoom/Teams URL
  
  startAt: Date;
  endAt: Date;
  registrationDeadline: Date;
  registrationStartAt?: Date;
  cancellationDeadline?: Date;

  isPaid: boolean;
  price: number; // In INR (e.g. 0 for free events)
  currency: string; // Defaults to "INR"
  
  capacity: number; // Maximum attendance limit
  registeredCount: number; // Current confirmed registrations
  allowWaitlist?: boolean;
  maxTeamSize?: number; // 1 = Individual, >1 = Team

  bannerUrl?: string;
  gallery?: string[];
  tags: string[];
  
  // Custom Registration Requirements & Rules
  eligibility?: string; // e.g. "Open to all B.Tech / UG Students"
  prerequisites?: string; // e.g. "Bring your laptop with Node.js installed"
  customQuestions?: CustomQuestion[];

  // Organiser & Host Information
  organiserId: string;
  organiserName: string;
  organiserEmail: string;
  organiserPhone?: string;
  organiserRole: UserRole;
  department: string;
  createdBy?: string;
  createdByEmail?: string;
  createdByName?: string;

  // Admin Approval Tracking
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database-level Firestore Document structure for events/{eventId}
 */
export interface FirestoreEventDocument {
  title: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  
  venueType: EventVenueType;
  venueLocation: string;
  
  startAt: FirestoreTimestamp;
  endAt: FirestoreTimestamp;
  registrationDeadline: FirestoreTimestamp;
  registrationStartAt?: FirestoreTimestamp;
  cancellationDeadline?: FirestoreTimestamp;

  isPaid: boolean;
  price: number;
  currency: string;
  
  capacity: number;
  registeredCount: number;
  allowWaitlist?: boolean;
  maxTeamSize?: number;

  bannerUrl?: string;
  gallery?: string[];
  tags: string[];
  
  eligibility?: string;
  prerequisites?: string;
  customQuestions?: CustomQuestion[];

  organiserId: string;
  organiserName: string;
  organiserEmail: string;
  organiserPhone?: string;
  organiserRole: UserRole;
  department?: string;

  approvedBy?: string;
  approvedAt?: FirestoreTimestamp;
  rejectionReason?: string;

  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  category: EventCategory;
  venueType: EventVenueType;
  venueLocation: string;
  startAt: Date | string;
  endAt: Date | string;
  registrationDeadline: Date | string;
  registrationStartAt?: Date | string;
  cancellationDeadline?: Date | string;
  isPaid: boolean;
  price?: number;
  capacity: number;
  allowWaitlist?: boolean;
  maxTeamSize?: number;
  bannerUrl?: string;
  gallery?: string[];
  tags?: string[];
  eligibility?: string;
  prerequisites?: string;
  customQuestions?: CustomQuestion[];
  department?: string;
}
