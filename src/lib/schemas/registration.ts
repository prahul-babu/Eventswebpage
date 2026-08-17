import { z } from "zod";
import { PHONE_REGEX, PHONE_ERROR_MESSAGES } from "@/lib/validation";

export const teamMemberSchema = z.object({
  name: z.string().min(2, "Member name must be at least 2 characters"),
  email: z.string().email("Valid institutional email is required"),
  rollNumber: z.string().min(3, "Roll number required").optional().or(z.literal("")),
});

export const createRegistrationSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  contactPhone: z
    .string()
    .regex(PHONE_REGEX, PHONE_ERROR_MESSAGES.INVALID)
    .optional()
    .or(z.literal("")),
  teamName: z.string().min(2, "Team name must be at least 2 characters").optional().or(z.literal("")),
  teamMembers: z.array(teamMemberSchema).optional(),
  answers: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the institutional terms & attendance policy." }),
  }),
});

export const cancelRegistrationSchema = z.object({
  registrationId: z.string().min(1, "Registration ID is required"),
  reason: z.string().max(200).optional(),
});

export type CreateRegistrationFormValues = z.infer<typeof createRegistrationSchema>;
export type CancelRegistrationFormValues = z.infer<typeof cancelRegistrationSchema>;
