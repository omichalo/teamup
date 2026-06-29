const SUBMISSION_ATTEMPT_ID_HEADER = "x-registration-attempt-id";

/** UUID v4 (client-generated) used to deduplicate accidental double submissions. */
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseSubmissionAttemptId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!UUID_V4_RE.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function readSubmissionAttemptId(req: Request): string | null {
  return parseSubmissionAttemptId(req.headers.get(SUBMISSION_ATTEMPT_ID_HEADER));
}

export const SUBMISSION_ATTEMPT_ID_FETCH_HEADER = SUBMISSION_ATTEMPT_ID_HEADER;
