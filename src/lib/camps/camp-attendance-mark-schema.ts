import { z } from "zod";
import { CAMP_ATTENDANCE_MARK_KINDS } from "./constants";
import { attendanceDateSchema } from "@/lib/attendance/schema";

const campMarkBaseSchema = z.object({
  source: z.literal("camp"),
  date: attendanceDateSchema,
  slotId: z.string().trim().min(1).max(120),
  kind: z.enum(CAMP_ATTENDANCE_MARK_KINDS),
  /** Inscription stage (enrolled) — alias historique `registrationId`. */
  campRegistrationId: z.string().trim().min(1).max(120).optional(),
  registrationId: z.string().trim().min(1).max(120).optional(),
  /** Dossier adhésion (member_walkin). */
  clubRegistrationId: z.string().trim().min(1).max(120).optional(),
  /** Id mark extérieur (delete) ou externalId. */
  markId: z.string().trim().min(1).max(200).optional(),
  externalId: z.string().trim().min(1).max(80).optional(),
  external: z
    .object({
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      phone: z
        .string()
        .trim()
        .max(20)
        .regex(/^[0-9+().\s-]*$/, "Téléphone invalide")
        .optional(),
      note: z.string().trim().max(200).optional(),
    })
    .optional(),
});

export const campAttendanceMarkBodySchema = campMarkBaseSchema.superRefine(
  (data, ctx) => {
    if (data.kind === "enrolled") {
      const id = data.campRegistrationId ?? data.registrationId;
      if (!id) {
        ctx.addIssue({
          code: "custom",
          path: ["campRegistrationId"],
          message: "Inscription stage requise",
        });
      }
    }
    if (data.kind === "member_walkin") {
      const id = data.clubRegistrationId ?? data.registrationId;
      if (!id) {
        ctx.addIssue({
          code: "custom",
          path: ["clubRegistrationId"],
          message: "Dossier adhérent requis",
        });
      }
    }
    if (data.kind === "external") {
      const hasCreate = Boolean(data.external);
      const hasDeleteId = Boolean(data.markId || data.externalId);
      if (!hasCreate && !hasDeleteId) {
        ctx.addIssue({
          code: "custom",
          path: ["external"],
          message: "Identité extérieur ou markId requis",
        });
      }
    }
  }
);

export type CampAttendanceMarkBody = z.infer<typeof campAttendanceMarkBodySchema>;

export function resolveCampEnrolledRegistrationId(
  body: CampAttendanceMarkBody
): string | null {
  return body.campRegistrationId ?? body.registrationId ?? null;
}

export function resolveCampClubRegistrationId(
  body: CampAttendanceMarkBody
): string | null {
  return body.clubRegistrationId ?? body.registrationId ?? null;
}
