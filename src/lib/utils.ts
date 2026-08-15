import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse any date value (Date, Timestamp, {seconds}, string, number) to a valid Date object.
 */
export function safeToDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return isNaN(value.getTime()) ? new Date() : value;
  if (typeof value === "object" && "toDate" in value && typeof (value as any).toDate === "function") {
    try {
      const d = (value as any).toDate();
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }
  if (typeof value === "object" && "seconds" in value) {
    const ts = value as { seconds: number; nanoseconds?: number };
    return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000);
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

/**
 * Safely format any date representation without throwing RangeError or uncaught exceptions.
 */
export function safeFormatDate(value: unknown, formatPattern: string, fallback: string = "Date TBA"): string {
  if (!value) return fallback;
  try {
    const d = safeToDate(value);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatPattern);
  } catch {
    return fallback;
  }
}
