import type { Representative } from "./schema";
import type { RegistrationStepId } from "./field-to-step";
import { stepsWithError } from "./field-to-step";

const LOG_PREFIX = "[club-registration]";

/**
 * Traces console en développement uniquement (e-mails masqués).
 * Optionnel : `NEXT_PUBLIC_DEBUG_REGISTRATION=true` pour forcer en preview.
 */
export function isRegistrationWizardDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEBUG_REGISTRATION === "true") {
    return true;
  }
  return process.env.NODE_ENV === "development";
}

function maskEmail(email: string): string {
  const t = email.trim();
  if (!t) return "(vide)";
  const at = t.indexOf("@");
  if (at <= 0) return "***";
  return `${t.slice(0, 1)}***${t.slice(at)}`;
}

export function summarizeRepresentativesForDebug(
  reps: Representative[]
): Array<{
  index: number;
  role: Representative["role"];
  firstNameLen: number;
  lastNameLen: number;
  email: string;
  phoneDigitCount: number;
}> {
  return reps.map((r, index) => ({
    index,
    role: r.role,
    firstNameLen: r.firstName.trim().length,
    lastNameLen: r.lastName.trim().length,
    email: maskEmail(r.email),
    phoneDigitCount: r.phone.replace(/\D/g, "").length,
  }));
}

/** Compatible Zod 3 et 4 (path peut inclure des symboles). */
type ZodIssueLike = {
  path: readonly PropertyKey[];
  message: string;
  code: string;
};

export function formatZodIssuesForDebug(
  issues: readonly ZodIssueLike[]
): Array<{ path: string; message: string; code: string }> {
  return issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export function logRegistrationWizardDebug(
  event: string,
  payload: Record<string, unknown>
): void {
  if (!isRegistrationWizardDebugEnabled()) return;
  console.log(LOG_PREFIX, event, payload);
}

export function logRegistrationFieldErrors(
  event: string,
  fieldErrors: Record<string, string[] | undefined>,
  sequence: ReadonlyArray<RegistrationStepId>
): void {
  if (!isRegistrationWizardDebugEnabled()) return;
  const stepIndices = stepsWithError(fieldErrors, sequence);
  const steps = stepIndices.map((idx) => ({
    index: idx,
    stepId: sequence[idx],
    label: idx + 1,
  }));
  logRegistrationWizardDebug(event, {
    stepsInError: steps,
    fieldErrors,
  });
}
