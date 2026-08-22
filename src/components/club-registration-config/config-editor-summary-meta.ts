import type { RegistrationConfigV1, RegistrationSection } from "@/lib/club-registration-config/types";
import { pricingProfileLabel } from "@/lib/club-registration-config/pricing-profiles";
import {
  formatSlotScheduleSummary,
  resolveSlotSchedule,
} from "@/lib/club-registration-config/slot-schedule";
import { SLOT_ENROLLMENTS_CLOSED_LABEL } from "@/lib/club-registration-config/slot-enrollments";
import { centsToEuroInput } from "./config-editor-utils";

export function sectionSummaryMeta(
  config: RegistrationConfigV1,
  section: RegistrationSection
): string | undefined {
  const parts: string[] = [];
  if (section.pricingProfile !== "classic") {
    parts.push(pricingProfileLabel(config, section.pricingProfile));
  }
  if (!section.enabled) {
    parts.push("Masquée dans le formulaire");
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function slotSummaryMeta(
  slot: {
    enabled: boolean;
    schoolPickupSchool?: string | undefined;
    weekday?: number | undefined;
    startMinutes?: number | undefined;
    endMinutes?: number | undefined;
    capacity?: number | undefined;
    enrollmentsClosed?: boolean | undefined;
    id?: string;
    label?: string;
  }
): string | undefined {
  const parts: string[] = [];
  const schedule = resolveSlotSchedule({
    id: slot.id ?? "",
    label: slot.label ?? "",
    weekday: slot.weekday,
    startMinutes: slot.startMinutes,
    endMinutes: slot.endMinutes,
  });
  if (schedule) {
    parts.push(formatSlotScheduleSummary(schedule));
  }
  if (typeof slot.capacity === "number") {
    parts.push(`${slot.capacity} places`);
  }
  if (slot.enrollmentsClosed) parts.push(SLOT_ENROLLMENTS_CLOSED_LABEL);
  if (!slot.enabled) parts.push("Inactif");
  if (slot.schoolPickupSchool) parts.push("Récup. scolaire");
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function competitionSummaryMeta(comp: {
  enabled: boolean;
  formGroup: "youth" | "other";
  priceCents: number;
  requiresAvailabilityCommitment?: boolean | undefined;
}): string {
  const parts = [
    comp.formGroup === "youth" ? "Jeunes" : "Autres",
    `${centsToEuroInput(comp.priceCents)} €`,
  ];
  if (comp.requiresAvailabilityCommitment) parts.push("Engagement disponibilité");
  if (!comp.enabled) parts.push("Masquée");
  return parts.join(" · ");
}

export function ageBandSummaryMeta(band: {
  minAge: number;
  maxAge?: number | undefined;
}): string {
  return band.maxAge !== undefined
    ? `${band.minAge}–${band.maxAge} ans`
    : `${band.minAge} ans et +`;
}
