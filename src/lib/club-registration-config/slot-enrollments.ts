import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { getEnabledSlots } from "./helpers";
import type { RegistrationConfigV1, RegistrationSiteSlot } from "./types";

export const SLOT_ENROLLMENTS_CLOSED_LABEL = "Inscriptions fermées";

export const SLOT_ENROLLMENT_CLOSE_BYPASS_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
  USER_ROLES.COACH,
  USER_ROLES.BOARD_MEMBER,
] as const;

export function canBypassSlotEnrollmentClose(role: UserRole | null | undefined): boolean {
  return role != null && hasAnyRole(role, SLOT_ENROLLMENT_CLOSE_BYPASS_ROLES);
}

export function isSlotEnrollmentsClosed(
  slot: Pick<RegistrationSiteSlot, "enrollmentsClosed">
): boolean {
  return slot.enrollmentsClosed === true;
}

export function getClosedEnabledSlotIds(config: RegistrationConfigV1): ReadonlySet<string> {
  return new Set(
    getEnabledSlots(config)
      .filter((slot) => isSlotEnrollmentsClosed(slot))
      .map((slot) => slot.id)
  );
}

export function omitClosedSlotsFromSelection(
  config: RegistrationConfigV1,
  slotIds: readonly string[]
): string[] {
  const closed = getClosedEnabledSlotIds(config);
  return slotIds.filter((id) => !closed.has(id));
}

function withEnrollmentsClosed(
  slot: RegistrationSiteSlot,
  closed: boolean
): RegistrationSiteSlot {
  const next = { ...slot };
  if (closed) {
    next.enrollmentsClosed = true;
  } else {
    delete next.enrollmentsClosed;
  }
  return next;
}

export function applySlotEnrollmentsClosed(
  config: RegistrationConfigV1,
  slotId: string,
  closed: boolean
): RegistrationConfigV1 | null {
  let found = false;
  const sites = config.sites.map((site) => ({
    ...site,
    slots: site.slots.map((slot) => {
      if (slot.id !== slotId) {
        return slot;
      }
      found = true;
      return withEnrollmentsClosed(slot, closed);
    }),
  }));
  if (!found) {
    return null;
  }
  return { ...config, sites };
}
