import { AvailabilityResponse } from "@/lib/services/availability-service";

export function sanitizeAvailabilityResponse(
  response?: AvailabilityResponse | null
): AvailabilityResponse | undefined {
  if (!response) {
    return undefined;
  }

  const sanitized: AvailabilityResponse = {};

  if (typeof response.available === "boolean") {
    sanitized.available = response.available;
  }

  if (typeof response.comment === "string") {
    const trimmed = response.comment.trim();
    if (trimmed.length > 0) {
      sanitized.comment = trimmed;
    }
  }

  if (typeof response.fridayAvailable === "boolean") {
    sanitized.fridayAvailable = response.fridayAvailable;
  }

  if (typeof response.saturdayAvailable === "boolean") {
    sanitized.saturdayAvailable = response.saturdayAvailable;
  }

  if (
    sanitized.available === undefined &&
    sanitized.comment === undefined &&
    sanitized.fridayAvailable === undefined &&
    sanitized.saturdayAvailable === undefined
  ) {
    return undefined;
  }

  return sanitized;
}
