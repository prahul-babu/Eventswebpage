import { isValidOptionalPhoneNumber, PHONE_ERROR_MESSAGES } from "./phone";

export interface EventValidationInput {
  title?: string;
  description?: string;
  category?: string;
  venueLocation?: string;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  registrationDeadline?: Date | string | null;
  capacity?: number | string;
  isPaid?: boolean;
  price?: number | string;
  contactPhone?: string;
}

export interface EventValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Universal Client-Side Event Form Validator
 */
export function validateEventForm(input: EventValidationInput): EventValidationResult {
  const errors: Record<string, string> = {};

  // 1. Title
  if (!input.title || !input.title.trim()) {
    errors.title = "Event title is required.";
  }

  // 2. Description
  if (!input.description || !input.description.trim()) {
    errors.description = "Event description is required.";
  }

  // 3. Category
  if (!input.category || !input.category.trim()) {
    errors.category = "Event category is required.";
  }

  // 4. Venue Location
  if (!input.venueLocation || !input.venueLocation.trim()) {
    errors.venueLocation = "Venue location is required.";
  }

  // 5. Capacity
  if (input.capacity === undefined || input.capacity === null || input.capacity === "") {
    errors.capacity = "Event capacity is required.";
  } else {
    const capNum = Number(input.capacity);
    if (isNaN(capNum) || capNum <= 0 || !Number.isInteger(capNum)) {
      errors.capacity = "Capacity must be a positive whole number.";
    }
  }

  // 6. Pricing (if paid)
  if (input.isPaid) {
    if (input.price === undefined || input.price === null || input.price === "") {
      errors.price = "Registration fee is required for paid events.";
    } else {
      const priceNum = Number(input.price);
      if (isNaN(priceNum) || priceNum < 0) {
        errors.price = "Registration fee cannot be negative.";
      }
    }
  }

  // 7. Dates and Deadlines
  if (input.startAt && input.endAt) {
    const start = new Date(input.startAt);
    const end = new Date(input.endAt);
    if (end <= start) {
      errors.endAt = "End time must be after the event start time.";
    }
  }

  if (input.registrationDeadline && input.startAt) {
    const deadline = new Date(input.registrationDeadline);
    const start = new Date(input.startAt);
    if (deadline > start) {
      errors.registrationDeadline = "Registration deadline cannot be after event start time.";
    }
  }

  // 8. Contact Phone (if provided)
  if (input.contactPhone && input.contactPhone.trim() && !isValidOptionalPhoneNumber(input.contactPhone)) {
    errors.contactPhone = PHONE_ERROR_MESSAGES.INVALID;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
