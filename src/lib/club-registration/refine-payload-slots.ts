import type { z } from "zod";
import { getClosedEnabledSlotIds } from "@/lib/club-registration-config/slot-enrollments";
import { getOpenEnrollmentExclusivityError } from "@/lib/club-registration-config/open-enrollment";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";

type RefineCtx = z.RefinementCtx;

/** Valide slotIds / schoolPickupSlotIds (connus, exclusivité libre, fermeture, pickup). */
export function refineRegistrationPayloadSlots(
  config: RegistrationConfigV1,
  data: { slotIds: string[]; schoolPickupSlotIds: string[] },
  ctx: RefineCtx,
  options: {
    allSlotIds: ReadonlySet<string>;
    schoolPickupSlotIds: ReadonlySet<string>;
    allowClosedSlots: boolean;
  }
): boolean {
  for (const id of data.slotIds) {
    if (!options.allSlotIds.has(id)) {
      ctx.addIssue({
        code: "custom",
        message: "Créneau inconnu",
        path: ["slotIds"],
      });
      return false;
    }
  }

  const openEnrollmentError = getOpenEnrollmentExclusivityError(config, data.slotIds);
  if (openEnrollmentError) {
    ctx.addIssue({
      code: "custom",
      message: openEnrollmentError,
      path: ["slotIds"],
    });
    return false;
  }

  if (!options.allowClosedSlots) {
    const closedSlotIds = getClosedEnabledSlotIds(config);
    if (data.slotIds.some((id) => closedSlotIds.has(id))) {
      ctx.addIssue({
        code: "custom",
        message: "Les inscriptions sont fermées sur un créneau sélectionné.",
        path: ["slotIds"],
      });
      return false;
    }
  }

  const selectedSlots = new Set(data.slotIds);
  for (const id of data.schoolPickupSlotIds) {
    if (!options.schoolPickupSlotIds.has(id)) {
      ctx.addIssue({
        code: "custom",
        message: "Créneau de récupération scolaire inconnu",
        path: ["schoolPickupSlotIds"],
      });
      return false;
    }
    if (!selectedSlots.has(id)) {
      ctx.addIssue({
        code: "custom",
        message:
          "La récupération à la sortie de l’école ne peut être demandée que pour un créneau sélectionné",
        path: ["schoolPickupSlotIds"],
      });
      return false;
    }
  }

  return true;
}
