import { CLUB_REGISTRATION_SITES } from "./constants";

/** Texte aligné sur sqyping.fr/loisirs (dispositif école → gymnase). */
export const SCHOOL_PICKUP_SERVICE = {
  title: "Récupération à la sortie de l’école",
  intro:
    "Pour permettre à un maximum d’enfants de profiter des entraînements, même lorsque les parents ne sont pas disponibles dès 17 h, SQY PING met en place un dispositif d’accompagnement depuis l’école jusqu’au gymnase.",
  steps: [
    "16 h 30 : les entraîneurs récupèrent les enfants à la sortie de l’école.",
    "Goûter : au gymnase, les enfants prennent un moment pour goûter (prévoir un goûter dans le sac).",
    "17 h 00 – 18 h 30 : entraînement.",
    "18 h 30 : les parents récupèrent les enfants au gymnase.",
  ],
  optInLabel:
    "Je souhaite bénéficier de la récupération à la sortie de l’école pour ce créneau",
} as const;

export const SCHOOL_PICKUP_SLOT_IDS: ReadonlySet<string> = new Set(
  CLUB_REGISTRATION_SITES.flatMap((site) =>
    site.slots.filter((slot) => slot.schoolPickupSchool).map((slot) => slot.id)
  )
);

export function getSlotSchoolPickupSchool(slotId: string): string | undefined {
  for (const site of CLUB_REGISTRATION_SITES) {
    const slot = site.slots.find((s) => s.id === slotId);
    if (slot?.schoolPickupSchool) return slot.schoolPickupSchool;
  }
  return undefined;
}

export function sanitizeSchoolPickupSlotIds(
  slotIds: readonly string[],
  schoolPickupSlotIds: readonly string[]
): string[] {
  const selected = new Set(slotIds);
  return schoolPickupSlotIds.filter(
    (id) => selected.has(id) && SCHOOL_PICKUP_SLOT_IDS.has(id)
  );
}
