import type { FirestoreTimestamp } from "./common";

// Payment Statuses
export const PAYMENT_STATUSES = [
  "CREATED",
  "CAPTURED",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
  "PENDING",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Gateways
export const PAYMENT_GATEWAYS = ["RAZORPAY", "FREE_TIER"] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

/**
 * Application-level Payment entity
 */
export interface Payment {
  id: string;
  userId: string;
  eventId: string;
  registrationId: string;
  
  amount: number; // in INR (e.g. 500)
  amountPaise: number; // in paise (e.g. 50000)
  currency: string; // default "INR"
  status: PaymentStatus;
  gateway: PaymentGateway;
  
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  
  errorMessage?: string;
  refundId?: string;
  refundedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database-level Firestore Document structure for payments/{paymentId}
 */
export interface FirestorePaymentDocument {
  id?: string;
  userId: string;
  eventId: string;
  registrationId: string;
  
  amount: number;
  amountPaise?: number;
  currency: string;
  status: PaymentStatus;
  gateway: PaymentGateway;
  
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  
  errorMessage?: string;
  refundId?: string;
  refundedAt?: FirestoreTimestamp;

  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * Create Payment Order Payload
 */
export interface CreatePaymentOrderPayload {
  registrationId: string;
}

export interface CreatePaymentOrderResponse {
  orderId: string;
  amount: number; // in paise
  currency: string;
  razorpayKeyId: string;
  paymentId: string;
  eventTitle: string;
}

/**
 * Verify Payment Payload
 */
export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  registrationId: string;
  ticketCode: string;
  paymentStatus: string;
}

/**
 * Admin Initiate Refund Payload
 */
export interface InitiateRefundPayload {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface InitiateRefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
}
