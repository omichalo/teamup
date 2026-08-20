import { z } from "zod";
import { ATTENDANCE_LEAD_STATUSES, ATTENDANCE_MARK_KINDS, YMD_RE } from "./constants";

export const attendanceDateSchema = z.string().regex(YMD_RE, "Date invalide");

export const attendanceMarkBodySchema = z
  .object({
    date: attendanceDateSchema,
    slotId: z.string().trim().min(1).max(120),
    kind: z.enum(ATTENDANCE_MARK_KINDS),
    registrationId: z.string().trim().min(1).max(120).optional(),
    leadId: z.string().trim().min(1).max(120).optional(),
    addSlotRequested: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "guest" && !data.leadId) {
      ctx.addIssue({
        code: "custom",
        path: ["leadId"],
        message: "leadId requis pour un essai",
      });
    }
    if (data.kind !== "guest" && !data.registrationId) {
      ctx.addIssue({
        code: "custom",
        path: ["registrationId"],
        message: "registrationId requis",
      });
    }
  });

export const attendanceLeadCreateSchema = z.object({
  date: attendanceDateSchema,
  slotId: z.string().trim().min(1).max(120),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .trim()
    .min(8, "Téléphone trop court")
    .max(20)
    .regex(/^[0-9+().\s-]+$/, "Téléphone invalide"),
  email: z.union([z.string().trim().email("Email invalide").max(200), z.literal("")]).optional(),
});

export const attendanceLeadPatchSchema = z.object({
  status: z.enum(ATTENDANCE_LEAD_STATUSES),
});

export const attendanceAddSlotSchema = z.object({
  date: attendanceDateSchema,
  slotId: z.string().trim().min(1).max(120),
  registrationId: z.string().trim().min(1).max(120),
});
