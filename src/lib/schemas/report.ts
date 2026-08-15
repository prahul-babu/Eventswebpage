import { z } from "zod";
import { REPORT_TYPES } from "@/types/report";

export const reportTypeSchema = z.enum(REPORT_TYPES);

export const generateReportSchema = z.object({
  type: reportTypeSchema,
  eventId: z.string().optional(),
  department: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;
