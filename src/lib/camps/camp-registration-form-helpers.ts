import type { Camp, CampSlot } from "./types";
import { listCampFormulas } from "./formulas";

/** Qui est inscrit au stage : foyer, autre adhérent (recherche), non-licencié. */
export const CAMP_SUBJECT_MODES = ["household", "search", "guest"] as const;
export type CampSubjectMode = (typeof CAMP_SUBJECT_MODES)[number];

export type CampPrefillIdentity = {
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string;
  clubRegistrationId: string | null;
};

export type ClubRegistrationPrefillSource = {
  id: string;
  status?: string | undefined;
  adherentRole?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  birthDate?: string | undefined;
  adherentEmail?: string | undefined;
  adherentPhonePrimary?: string | undefined;
  submitterAccountEmail?: string | undefined;
};

export function listActiveClubRegistrations(
  registrations: ClubRegistrationPrefillSource[]
): ClubRegistrationPrefillSource[] {
  return registrations.filter(
    (r) => r.status !== "cancelled" && r.status !== "rejected"
  );
}

/** Défaut : dossier « self », sinon le premier actif. */
export function pickActiveClubRegistration(
  registrations: ClubRegistrationPrefillSource[]
): ClubRegistrationPrefillSource | null {
  const active = listActiveClubRegistrations(registrations);
  if (active.length === 0) return null;
  return (
    active.find((r) => r.adherentRole === "self") ??
    active[0] ??
    null
  );
}

export function clubRegistrationOptionLabel(
  reg: ClubRegistrationPrefillSource
): string {
  const name = `${String(reg.firstName ?? "").trim()} ${String(reg.lastName ?? "").trim()}`.trim();
  const role =
    reg.adherentRole === "self"
      ? "Moi"
      : reg.adherentRole === "minor_dependent"
        ? "Mineur à charge"
        : reg.adherentRole === "other_adult"
          ? "Autre adulte"
          : null;
  if (name && role) return `${name} (${role})`;
  if (name) return name;
  return role ?? reg.id;
}

export function identityFromClubRegistration(
  reg: ClubRegistrationPrefillSource,
  fallbackEmail = ""
): CampPrefillIdentity {
  return {
    firstName: String(reg.firstName ?? "").trim(),
    lastName: String(reg.lastName ?? "").trim(),
    birthDate: String(reg.birthDate ?? "").trim(),
    phone: String(reg.adherentPhonePrimary ?? "").trim(),
    email: String(
      reg.adherentEmail ?? reg.submitterAccountEmail ?? fallbackEmail
    ).trim(),
    clubRegistrationId: reg.id,
  };
}

export function listCampSites(camp: Pick<Camp, "sites">): Array<{
  id: string;
  label: string;
}> {
  return camp.sites.map((site) => ({ id: site.id, label: site.label }));
}

export function formulasForSite(
  camp: Pick<Camp, "sites">,
  siteId: string
): ReturnType<typeof listCampFormulas> {
  return listCampFormulas(camp).filter((f) => f.siteId === siteId);
}

/** Tous les créneaux de la formule/site (semaine complète). */
export function allSlotIdsForSelection(
  slots: readonly CampSlot[],
  siteId: string,
  formulaId: string
): string[] {
  return slots
    .filter((s) => s.siteId === siteId && s.formulaId === formulaId && !s.cancelled)
    .map((s) => s.id);
}

export type CampSlotsByDate = {
  date: string;
  slots: CampSlot[];
  slotIds: string[];
  labels: string[];
};

/** Groupe les créneaux par jour (ordre chronologique, créneaux triés). */
export function groupCampSlotsByDate(
  slots: readonly CampSlot[]
): CampSlotsByDate[] {
  const byDate = new Map<string, CampSlot[]>();
  for (const slot of slots) {
    const list = byDate.get(slot.date) ?? [];
    list.push(slot);
    byDate.set(slot.date, list);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySlots]) => {
      const sorted = [...daySlots].sort(
        (a, b) => a.startMinutes - b.startMinutes
      );
      return {
        date,
        slots: sorted,
        slotIds: sorted.map((s) => s.id),
        labels: sorted.map((s) => s.label),
      };
    });
}

export function formatCampSlotDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function campDaySelectionLabel(group: CampSlotsByDate): string {
  const dateLabel = formatCampSlotDate(group.date);
  const detail =
    group.labels.length > 0 ? ` (${group.labels.join(", ")})` : "";
  return `${dateLabel} — journée${detail}`;
}

export function isDayFullySelected(
  selectedSlotIds: readonly string[],
  daySlotIds: readonly string[]
): boolean {
  if (daySlotIds.length === 0) return false;
  const selected = new Set(selectedSlotIds);
  return daySlotIds.every((id) => selected.has(id));
}

/** Coche / décoche tous les créneaux d’une journée. */
export function toggleDaySlotIds(
  selectedSlotIds: readonly string[],
  daySlotIds: readonly string[],
  checked: boolean
): string[] {
  const daySet = new Set(daySlotIds);
  if (checked) {
    const next = new Set(selectedSlotIds);
    for (const id of daySlotIds) next.add(id);
    return [...next];
  }
  return selectedSlotIds.filter((id) => !daySet.has(id));
}
