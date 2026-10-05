import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import {
  resolveCancellationTargets,
  type CancellationScope,
} from "./cancellations";
import { attendanceSessionId } from "./mark-id";
import { buildSessionPayload } from "./roster";
import {
  attendanceSessionNoteClearSchema,
  attendanceSessionNoteUpsertSchema,
} from "./schema";
import { truncateCoachMessageForAudit } from "./session-notes";

const config = getDefaultRegistrationConfig();

function targetsFor(date: string, scope: CancellationScope, slotId?: string) {
  return resolveCancellationTargets({ config, date, scope, slotId });
}

describe("attendance session notes — scope fan-out", () => {
  it("scope slot ne cible qu'une occurrence", () => {
    const date = "2026-08-20";
    const dayTargets = targetsFor(date, "day");
    expect(dayTargets.length).toBeGreaterThan(1);
    const slotId = dayTargets[0]!.slotId;
    const slotTargets = targetsFor(date, "slot", slotId);
    expect(slotTargets).toEqual([
      { date, slotId, siteId: dayTargets[0]!.siteId },
    ]);
  });

  it("scope day produit une cible par créneau du catalogue", () => {
    const date = "2026-08-20";
    const dayTargets = targetsFor(date, "day");
    expect(dayTargets.length).toBeGreaterThan(1);
    expect(new Set(dayTargets.map((t) => t.slotId)).size).toBe(dayTargets.length);
    expect(dayTargets.every((t) => t.date === date)).toBe(true);
  });

  it("scope week couvre plusieurs dates de la semaine ISO", () => {
    const date = "2026-08-20";
    const weekTargets = targetsFor(date, "week");
    const dayTargets = targetsFor(date, "day");
    expect(weekTargets.length).toBeGreaterThan(dayTargets.length);
    expect(new Set(weekTargets.map((t) => t.date)).size).toBeGreaterThan(1);
  });

  it("les ids de documents sont déterministes date__slotId", () => {
    const targets = targetsFor("2026-08-20", "day");
    const ids = targets.map((t) => attendanceSessionId(t.date, t.slotId));
    expect(ids[0]).toBe(`2026-08-20__${targets[0]!.slotId}`);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("attendance session note schema", () => {
  it("accepte upsert slot et body vide (clear)", () => {
    expect(
      attendanceSessionNoteUpsertSchema.safeParse({
        date: "2026-08-20",
        slotId: "slot-a",
        body: "Fin anticipée à 20h",
      }).success
    ).toBe(true);
    expect(
      attendanceSessionNoteUpsertSchema.safeParse({
        date: "2026-08-20",
        slotId: "slot-a",
        body: "",
      }).success
    ).toBe(true);
  });

  it("accepte upsert day/week sans slotId", () => {
    expect(
      attendanceSessionNoteUpsertSchema.safeParse({
        date: "2026-08-20",
        scope: "day",
        body: "Message jour",
      }).success
    ).toBe(true);
    expect(
      attendanceSessionNoteUpsertSchema.safeParse({
        date: "2026-08-20",
        scope: "week",
        body: "Message semaine",
      }).success
    ).toBe(true);
  });

  it("refuse day avec slotId renseigné", () => {
    expect(
      attendanceSessionNoteUpsertSchema.safeParse({
        date: "2026-08-20",
        scope: "day",
        slotId: "slot-a",
        body: "x",
      }).success
    ).toBe(false);
  });

  it("accepte clear schema slot et day", () => {
    expect(
      attendanceSessionNoteClearSchema.safeParse({
        date: "2026-08-20",
        slotId: "slot-a",
      }).success
    ).toBe(true);
    expect(
      attendanceSessionNoteClearSchema.safeParse({
        date: "2026-08-20",
        scope: "day",
      }).success
    ).toBe(true);
  });
});

describe("buildSessionPayload coachMessage", () => {
  const slot = {
    slotId: "slot-a",
    label: "Jeudi / 19h00",
    siteId: "voisins",
    siteLabel: "Voisins",
    weekday: 4,
    startMinutes: 19 * 60,
    endMinutes: 20 * 60 + 45,
    highlighted: true,
    enrollmentsClosed: false,
    cancelled: false,
  };

  it("expose coachMessage trimé ou null", () => {
    const withMessage = buildSessionPayload({
      date: "2026-08-20",
      slot,
      coachMessage: "  Attention salle  ",
      registrations: [],
      marks: [],
    });
    expect(withMessage.coachMessage).toBe("Attention salle");

    const empty = buildSessionPayload({
      date: "2026-08-20",
      slot,
      coachMessage: "   ",
      registrations: [],
      marks: [],
    });
    expect(empty.coachMessage).toBeNull();

    const omitted = buildSessionPayload({
      date: "2026-08-20",
      slot,
      registrations: [],
      marks: [],
    });
    expect(omitted.coachMessage).toBeNull();
  });
});

describe("truncateCoachMessageForAudit", () => {
  it("tronque les messages longs", () => {
    const long = "a".repeat(100);
    expect(truncateCoachMessageForAudit(long, 80).endsWith("…")).toBe(true);
    expect(truncateCoachMessageForAudit("court", 80)).toBe("court");
  });
});
