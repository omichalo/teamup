import { attendanceAlertsFromRegistration } from "./alerts";
import { buildAttendanceMarkId } from "./mark-id";
import { buildSessionPayload } from "./roster";
import { registrationMatchesQuery } from "./search-members";
import { leadMatchesQuery, maskLeadPhone } from "./search-leads";
import { formatAttendanceSlotDisplay } from "./slot-display";
import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import { buildSlotAnalytics, buildSlotStats, buildAttendanceExportCsv } from "./stats";
import {
  countIsoWeekdayOccurrences,
  isoWeekdayFromYmd,
  isoWeekDates,
  isoWeekStartYmd,
  seasonBoundsYmd,
} from "./calendar";
import {
  applyCancellationsToSlots,
  cancellationKey,
  cancelledKeySet,
  filterActiveTargets,
  resolveCancellationTargets,
} from "./cancellations";
import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import { listSlotsForDate } from "./slots-for-date";

describe("attendance alerts", () => {
  it("signale paiement et certificat manquant", () => {
    expect(
      attendanceAlertsFromRegistration({
        status: "submitted",
        paymentStatus: "waiting_payment",
        medicalCertificateDeclaration: "adult_certificate_required",
        medicalCertificateStatus: "required_not_received",
        birthDate: "1990-01-01",
      })
    ).toEqual(["unpaid", "certificate"]);
  });

  it("signale un PPS attendu", () => {
    expect(
      attendanceAlertsFromRegistration({
        status: "paid",
        paymentStatus: "paid",
        medicalCertificateDeclaration: "adult_pps_declared",
        ppsFollowUpStatus: "expected",
        birthDate: "1990-01-01",
      })
    ).toEqual(["pps"]);
  });

  it("n'alerte pas un dossier soldé sans certificat requis", () => {
    expect(
      attendanceAlertsFromRegistration({
        status: "paid",
        paymentStatus: "paid",
        medicalCertificateDeclaration: "under_40_all_no",
        ppsFollowUpStatus: "not_applicable",
        birthDate: "2015-01-01",
      })
    ).toEqual([]);
  });
});

describe("attendance mark id", () => {
  it("est déterministe pour un adhérent inscrit", () => {
    expect(
      buildAttendanceMarkId({
        date: "2026-08-20",
        slotId: "voisins-jeu-1900-adultes-elite",
        kind: "enrolled",
        registrationId: "reg-1",
      })
    ).toBe("2026-08-20__voisins-jeu-1900-adultes-elite__reg_reg-1");
  });

  it("partage le même document walk-in et enrolled", () => {
    const base = {
      date: "2026-08-20",
      slotId: "slot-a",
      registrationId: "reg-1",
    };
    expect(buildAttendanceMarkId({ ...base, kind: "walkin" })).toBe(
      buildAttendanceMarkId({ ...base, kind: "enrolled" })
    );
  });

  it("réutilise le même leadId sur des dates différentes", () => {
    const leadId = "lead-armand";
    const slotId = "voisins-mer-1400-jeunes-loisirs";
    expect(
      buildAttendanceMarkId({
        date: "2026-09-09",
        slotId,
        kind: "guest",
        leadId,
      })
    ).toBe(`2026-09-09__${slotId}__guest_${leadId}`);
    expect(
      buildAttendanceMarkId({
        date: "2026-09-16",
        slotId,
        kind: "guest",
        leadId,
      })
    ).toBe(`2026-09-16__${slotId}__guest_${leadId}`);
  });
});

describe("attendance roster", () => {
  it("place les inscrits en liste et les essais en extras", () => {
    const payload = buildSessionPayload({
      date: "2026-08-20",
      slot: {
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
      },
      registrations: [
        {
          id: "reg-b",
          data: { firstName: "Béatrice", lastName: "Martin", status: "submitted" },
        },
        {
          id: "reg-a",
          data: { firstName: "Alain", lastName: "Dupont", status: "paid", paymentStatus: "paid" },
        },
      ],
      marks: [
        {
          id: "m1",
          date: "2026-08-20",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-a",
          displayName: "Alain Dupont",
          markedAt: "2026-08-20T18:00:00.000Z",
          markedByUid: "coach-1",
        },
        {
          id: "m2",
          date: "2026-08-20",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "guest",
          leadId: "lead-1",
          displayName: "Essai Test",
          markedAt: "2026-08-20T18:01:00.000Z",
          markedByUid: "coach-1",
        },
      ],
    });
    expect(payload.roster.map((p) => p.registrationId)).toEqual(["reg-a", "reg-b"]);
    expect(payload.roster[0]?.present).toBe(true);
    expect(payload.roster[1]?.present).toBe(false);
    expect(payload.extras).toHaveLength(1);
    expect(payload.counts).toEqual({
      enrolled: 2,
      presentEnrolled: 1,
      walkin: 0,
      guest: 1,
    });
    expect(payload.cancelled).toBe(false);
  });
});

describe("attendance calendar / stats", () => {
  it("liste les créneaux du jeudi depuis la config par défaut", () => {
    const config = getDefaultRegistrationConfig();
    const slots = listSlotsForDate(config, "2026-08-20", 19 * 60);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => slot.weekday === 4)).toBe(true);
    expect(slots.every((slot) => slot.cancelled === false)).toBe(true);
    expect(slots.some((slot) => slot.highlighted)).toBe(true);
  });

  it("compte les jeudis entre deux dates", () => {
    expect(isoWeekdayFromYmd("2026-08-20")).toBe(4);
    expect(countIsoWeekdayOccurrences("2026-08-20", "2026-08-27", 4)).toBe(2);
  });

  it("calcule un taux enrolled / occurrences", () => {
    const bounds = seasonBoundsYmd("2025-2026");
    expect(bounds).toEqual({ start: "2025-09-01", end: "2026-08-31" });
    const stats = buildSlotStats({
      date: "2026-08-20",
      slotId: "slot-a",
      weekday: 4,
      seasonLabel: "2025-2026",
      registrations: [
        {
          id: "reg-1",
          data: {
            firstName: "Alain",
            lastName: "Dupont",
            submittedAt: "2026-08-06T10:00:00.000Z",
          },
        },
      ],
      marks: [
        {
          id: "m1",
          date: "2026-08-13",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Alain Dupont",
          markedAt: "x",
          markedByUid: "c",
        },
        {
          id: "m2",
          date: "2026-08-20",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "walkin",
          registrationId: "reg-2",
          displayName: "Walk In",
          markedAt: "x",
          markedByUid: "c",
        },
      ],
    });
    // 2 dates avec pointage (13 et 20), même si submittedAt est plus tôt.
    expect(stats.players[0]?.expectedCount).toBe(2);
    expect(stats.players[0]?.presentCount).toBe(1);
    expect(stats.walkin).toBe(1);
  });

  it("retire les dates annulées du dénominateur et du numérateur", () => {
    const stats = buildSlotStats({
      date: "2026-08-20",
      slotId: "slot-a",
      weekday: 4,
      seasonLabel: "2025-2026",
      cancelledDates: new Set(["2026-08-13"]),
      registrations: [
        {
          id: "reg-1",
          data: {
            firstName: "Alain",
            lastName: "Dupont",
            submittedAt: "2026-08-06T10:00:00.000Z",
          },
        },
      ],
      marks: [
        {
          id: "m1",
          date: "2026-08-13",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Alain Dupont",
          markedAt: "x",
          markedByUid: "c",
        },
        {
          id: "m2",
          date: "2026-08-20",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Alain Dupont",
          markedAt: "x",
          markedByUid: "c",
        },
      ],
    });
    expect(stats.players[0]?.expectedCount).toBe(1);
    expect(stats.players[0]?.presentCount).toBe(1);
  });

  it("ignore les séances sans aucun pointage", () => {
    const stats = buildSlotStats({
      date: "2026-09-22",
      slotId: "slot-a",
      weekday: 2,
      seasonLabel: "2026-2027",
      registrations: [
        {
          id: "reg-1",
          data: {
            firstName: "Anatole",
            lastName: "Taburet",
            submittedAt: "2026-08-01T10:00:00.000Z",
          },
        },
      ],
      marks: [
        {
          id: "m1",
          date: "2026-09-08",
          slotId: "slot-a",
          siteId: "guy",
          seasonLabel: "2026-2027",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Anatole Taburet",
          markedAt: "x",
          markedByUid: "c",
        },
        {
          id: "m2",
          date: "2026-09-22",
          slotId: "slot-a",
          siteId: "guy",
          seasonLabel: "2026-2027",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Anatole Taburet",
          markedAt: "x",
          markedByUid: "c",
        },
      ],
    });
    // 15/09 n'a aucun mark → pas dans le dénominateur (2, pas 3).
    expect(stats.players[0]?.expectedCount).toBe(2);
    expect(stats.players[0]?.presentCount).toBe(2);
  });

  it("agrège les séances et KPI pour un créneau (analytics)", () => {
    const analytics = buildSlotAnalytics({
      date: "2026-08-20",
      slotId: "slot-a",
      weekday: 4,
      seasonLabel: "2025-2026",
      capacity: 20,
      registrations: [
        {
          id: "reg-1",
          data: {
            firstName: "Alain",
            lastName: "Dupont",
            submittedAt: "2026-08-06T10:00:00.000Z",
          },
        },
        {
          id: "reg-2",
          data: {
            firstName: "Béatrice",
            lastName: "Martin",
            submittedAt: "2026-08-06T10:00:00.000Z",
          },
        },
      ],
      marks: [
        {
          id: "m1",
          date: "2026-08-13",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Alain Dupont",
          markedAt: "x",
          markedByUid: "c",
        },
        {
          id: "m2",
          date: "2026-08-13",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "guest",
          leadId: "lead-1",
          displayName: "Essai",
          markedAt: "x",
          markedByUid: "c",
        },
        {
          id: "m3",
          date: "2026-08-20",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Alain Dupont",
          markedAt: "x",
          markedByUid: "c",
        },
        {
          id: "m4",
          date: "2026-08-20",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-2",
          displayName: "Béatrice Martin",
          markedAt: "x",
          markedByUid: "c",
        },
        {
          id: "m5",
          date: "2026-08-20",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "walkin",
          registrationId: "reg-3",
          displayName: "Walk In",
          markedAt: "x",
          markedByUid: "c",
        },
      ],
    });

    expect(analytics.sessions).toEqual([
      { date: "2026-08-13", enrolled: 1, walkin: 0, guest: 1, total: 2 },
      { date: "2026-08-20", enrolled: 2, walkin: 1, guest: 0, total: 3 },
    ]);
    expect(analytics.kpis.pointedSessionCount).toBe(2);
    expect(analytics.kpis.cancelledSessionCount).toBe(0);
    expect(analytics.kpis.avgPresentEnrolled).toBe(1.5);
    expect(analytics.kpis.avgPresentTotal).toBe(2.5);
    expect(analytics.kpis.peakTotal).toBe(3);
    expect(analytics.kpis.peakDate).toBe("2026-08-20");
    expect(analytics.kpis.seasonWalkinTotal).toBe(1);
    expect(analytics.kpis.seasonGuestTotal).toBe(1);
    expect(analytics.kpis.capacity).toBe(20);
    expect(analytics.kpis.avgOccupancyVsCapacity).toBe(2.5 / 20);
    expect(analytics.kpis.enrolledCount).toBe(2);
    expect(analytics.players).toHaveLength(2);
    expect(analytics.players.find((p) => p.registrationId === "reg-1")?.presentCount).toBe(2);
  });

  it("exclut les séances annulées des analytics et compte les annulations", () => {
    const analytics = buildSlotAnalytics({
      date: "2026-08-20",
      slotId: "slot-a",
      weekday: 4,
      seasonLabel: "2025-2026",
      cancelledDates: new Set(["2026-08-13"]),
      registrations: [
        {
          id: "reg-1",
          data: {
            firstName: "Alain",
            lastName: "Dupont",
            submittedAt: "2026-08-06T10:00:00.000Z",
          },
        },
      ],
      marks: [
        {
          id: "m1",
          date: "2026-08-13",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Alain Dupont",
          markedAt: "x",
          markedByUid: "c",
        },
        {
          id: "m2",
          date: "2026-08-20",
          slotId: "slot-a",
          siteId: "voisins",
          seasonLabel: "2025-2026",
          sessionId: "s",
          kind: "enrolled",
          registrationId: "reg-1",
          displayName: "Alain Dupont",
          markedAt: "x",
          markedByUid: "c",
        },
      ],
    });
    expect(analytics.sessions).toHaveLength(1);
    expect(analytics.sessions[0]?.date).toBe("2026-08-20");
    expect(analytics.kpis.cancelledSessionCount).toBe(1);
    expect(analytics.kpis.avgOccupancyVsCapacity).toBeNull();
    expect(analytics.players[0]?.presentCount).toBe(1);
    expect(analytics.players[0]?.expectedCount).toBe(1);
  });
});

describe("attendance cancellations helpers", () => {
  it("calcule la semaine ISO lundi-dimanche", () => {
    expect(isoWeekStartYmd("2026-08-17")).toBe("2026-08-17");
    expect(isoWeekDates("2026-08-19")).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
  });

  it("marque les créneaux annulés sans les retirer", () => {
    const config = getDefaultRegistrationConfig();
    const slots = listSlotsForDate(config, "2026-08-17", 12 * 60);
    expect(slots.length).toBeGreaterThan(0);
    const first = slots[0];
    if (!first) {
      throw new Error("expected slot");
    }
    const marked = applyCancellationsToSlots(
      slots,
      new Set([cancellationKey("2026-08-17", first.slotId)]),
      "2026-08-17"
    );
    expect(marked.find((slot) => slot.slotId === first.slotId)?.cancelled).toBe(true);
    expect(marked.filter((slot) => !slot.cancelled).length).toBe(slots.length - 1);
  });

  it("résout les cibles day et week", () => {
    const config = getDefaultRegistrationConfig();
    const dayTargets = resolveCancellationTargets({
      config,
      date: "2026-08-17",
      scope: "day",
    });
    const weekTargets = resolveCancellationTargets({
      config,
      date: "2026-08-17",
      scope: "week",
    });
    expect(dayTargets.length).toBeGreaterThan(0);
    expect(weekTargets.length).toBeGreaterThan(dayTargets.length);
    expect(dayTargets.every((target) => target.date === "2026-08-17")).toBe(true);
    const active = filterActiveTargets(dayTargets, cancelledKeySet([dayTargets[0]!]));
    expect(active).toHaveLength(dayTargets.length - 1);
  });
});

describe("attendance search / export", () => {
  it("matche un nom sans accent", () => {
    expect(registrationMatchesQuery("Béatrice", "Martin", "bea mar")).toBe(true);
    expect(registrationMatchesQuery("Alain", "Dupont", "z")).toBe(false);
  });

  it("matche un essai par nom ou téléphone", () => {
    expect(leadMatchesQuery("Armand", "De Montleau", "0612345678", "arm mont")).toBe(
      true
    );
    expect(leadMatchesQuery("Armand", "De Montleau", "0612345678", "123456")).toBe(
      true
    );
    expect(leadMatchesQuery("Armand", "De Montleau", "0612345678", "zz")).toBe(false);
  });

  it("masque le téléphone d'un essai", () => {
    expect(maskLeadPhone("06 12 34 56 78")).toBe("06***78");
  });

  it("affiche un créneau lisible sans l'id technique", () => {
    const config = getDefaultRegistrationConfig();
    const slotId = config.sites.flatMap((site) => site.slots).find((slot) => slot.enabled)?.id;
    expect(slotId).toBeTruthy();
    const label = formatAttendanceSlotDisplay(config, slotId!);
    expect(label).not.toContain(slotId!);
    expect(label).toMatch(/·/);
    expect(formatAttendanceSlotDisplay(config, "slot-inexistant")).toBe("Créneau inconnu");
  });

  it("exporte un CSV", () => {
    const csv = buildAttendanceExportCsv([
      {
        date: "2026-08-20",
        siteLabel: "Voisins",
        slotLabel: "Jeudi / 19h00",
        displayName: "Alain Dupont",
        kind: "enrolled",
        alerts: ["unpaid"],
      },
    ]);
    expect(csv).toContain("date,gymnase,creneau,nom,type,alertes");
    expect(csv).toContain("Paiement");
  });
});
