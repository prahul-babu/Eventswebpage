import { z } from "zod";
import { PAYMENT_STATUSES, PAYMENT_GATEWAYS } from "@/types/payment";

export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const paymentGatewaySchema = z.enum(PAYMENT_GATEWAYS);

export const createRazorpayOrderSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, "Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Payment ID is required"),
  razorpaySignature: z.string().min(1, "Signature is required"),
  eventId: z.string().min(1, "Event ID is required"),
});

export type CreateRazorpayOrderInput = z.infer<typeof createRazorpayOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
