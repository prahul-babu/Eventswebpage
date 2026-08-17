import { useMutation, useQueryClient } from "@tanstack/react-query";
import { httpsCallable } from "firebase/functions";
import { functions, auth } from "@/lib/firebase";
import type {
  CreatePaymentOrderPayload,
  CreatePaymentOrderResponse,
  VerifyPaymentPayload,
  VerifyPaymentResponse,
} from "@/types";
import { toast } from "sonner";
import { createAuditLog } from "@/lib/audit";

/**
 * Dynamically loads the official Razorpay Checkout JavaScript SDK
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay Checkout SDK");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * 1. Create Payment Order Mutation
 */
export function useCreatePaymentOrder() {
  return useMutation<CreatePaymentOrderResponse, Error, CreatePaymentOrderPayload>({
    mutationFn: async (payload) => {
      const createOrderFn = httpsCallable<CreatePaymentOrderPayload, CreatePaymentOrderResponse>(
        functions,
        "createPaymentOrder"
      );
      const result = await createOrderFn(payload);
      return result.data;
    },
    onError: (err) => {
      toast.error("Checkout Initialization Failed", {
        description: err.message || "Unable to initiate payment session. Please try again.",
      });
    },
  });
}

/**
 * 2. Verify Payment Mutation
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation<VerifyPaymentResponse, Error, VerifyPaymentPayload>({
    mutationFn: async (payload) => {
      try {
        const verifyFn = httpsCallable<VerifyPaymentPayload, VerifyPaymentResponse>(
          functions,
          "verifyPayment"
        );
        const result = await verifyFn(payload);
        return result.data;
      } catch (err: any) {
        createAuditLog({
          action: "PAYMENT_FAILED",
          actionCategory: "PAYMENTS",
          targetType: "PAYMENT",
          targetId: payload.razorpayPaymentId || payload.razorpayOrderId,
          description: `Payment verification failed for order ${payload.razorpayOrderId}: ${err.message || "Authentication signature mismatch"}`,
          status: "FAILED",
          details: { orderId: payload.razorpayOrderId, error: err.message },
        });
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["registration"] });
      queryClient.invalidateQueries({ queryKey: ["event"] });
      queryClient.invalidateQueries({ queryKey: ["student", "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["student", "next-registration"] });
      queryClient.invalidateQueries({ queryKey: ["student", "stats"] });

      createAuditLog({
        action: "PAYMENT_SUCCESSFUL",
        actionCategory: "PAYMENTS",
        actorId: auth.currentUser?.uid || "student",
        actorName: auth.currentUser?.displayName || "Student Participant",
        actorEmail: auth.currentUser?.email || "",
        actorRole: "STUDENT",
        targetType: "PAYMENT",
        targetId: data.registrationId || data.ticketCode,
        targetName: `Ticket Pass ${data.ticketCode}`,
        description: `Payment verified and ticket pass confirmed (${data.ticketCode}).`,
        status: "SUCCESS",
        details: { ticketCode: data.ticketCode, registrationId: data.registrationId },
      });

      toast.success("Payment Verified & Confirmed!", {
        description: `Official ticket pass code: ${data.ticketCode}.`,
      });
    },
    onError: (err) => {
      toast.error("Payment Verification Failed", {
        description: err.message || "Failed to confirm payment with banking servers.",
      });
    },
  });
}
