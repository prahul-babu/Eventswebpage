import { z } from "zod";
import { EVENT_CATEGORIES, EVENT_VENUE_TYPES } from "@/types/event";

export const customQuestionSchema = z.object({
  id: z.string(),
  label: z.string().min(2, "Question label is required"),
  type: z.enum(["text", "select", "radio", "checkbox"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

// Step 1: Base Shape
export const eventStep1Base = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must not exceed 120 characters"),
  category: z.enum(EVENT_CATEGORIES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: "Please select an event category" }),
  }),
  shortSummary: z
    .string()
    .max(200, "Short summary must not exceed 200 characters")
    .optional()
    .or(z.literal("")),
  description: z.string().min(10, "Event description must be at least 10 characters"),
  tags: z.array(z.string()).default([]),
  bannerUrl: z.string().optional().or(z.literal("")),
});

// Step 2: Base Shape
export const eventStep2Base = z.object({
  startAt: z.string().min(1, "Start date and time is required"),
  endAt: z.string().min(1, "End date and time is required"),
  venueType: z.enum(EVENT_VENUE_TYPES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: "Please select a delivery mode" }),
  }),
  venueLocation: z.string().min(2, "Venue location or meeting link is required"),
  registrationOpensAt: z.string().optional().or(z.literal("")),
  registrationDeadline: z.string().min(1, "Registration deadline is required"),
});

// Step 3: Base Shape
export const eventStep3Base = z.object({
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1 seat"),
  allowWaitlist: z.boolean().default(false),
  isPaid: z.boolean().default(false),
  price: z.coerce.number().min(0).default(0),
  refundPolicy: z.string().optional().or(z.literal("")),
  eligibility: z.string().optional().or(z.literal("")),
  prerequisites: z.string().optional().or(z.literal("")),
  maxTeamSize: z.coerce.number().int().min(1, "Team size must be at least 1").default(1),
  customQuestions: z.array(customQuestionSchema).default([]),
});

// Individual Step Validation Schemas with Refinements
export const eventStep1Schema = eventStep1Base;

export const eventStep2Schema = eventStep2Base
  .refine(
    (data) => {
      const start = new Date(data.startAt).getTime();
      const end = new Date(data.endAt).getTime();
      return end > start;
    },
    {
      message: "Event end time must be after start time",
      path: ["endAt"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startAt).getTime();
      const deadline = new Date(data.registrationDeadline).getTime();
      return deadline <= start;
    },
    {
      message: "Registration deadline must be on or before the event start time",
      path: ["registrationDeadline"],
    }
  );

export const eventStep3Schema = eventStep3Base.refine(
  (data) => {
    if (data.isPaid) {
      return data.price >= 1 && data.price <= 50000;
    }
    return true;
  },
  {
    message: "Registration fee for paid events must be between ₹1 and ₹50,000",
    path: ["price"],
  }
);

// Full Combined Event Wizard Schema
export const eventWizardSchema = z
  .object({
    ...eventStep1Base.shape,
    ...eventStep2Base.shape,
    ...eventStep3Base.shape,
  })
  .refine(
    (data) => {
      const start = new Date(data.startAt).getTime();
      const end = new Date(data.endAt).getTime();
      return end > start;
    },
    {
      message: "Event end time must be after start time",
      path: ["endAt"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startAt).getTime();
      const deadline = new Date(data.registrationDeadline).getTime();
      return deadline <= start;
    },
    {
      message: "Registration deadline must be on or before the event start time",
      path: ["registrationDeadline"],
    }
  )
  .refine(
    (data) => {
      if (data.isPaid) {
        return data.price >= 1 && data.price <= 50000;
      }
      return true;
    },
    {
      message: "Registration fee for paid events must be between ₹1 and ₹50,000",
      path: ["price"],
    }
  );

export type EventWizardFormValues = z.infer<typeof eventWizardSchema>;
