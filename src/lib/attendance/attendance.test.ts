import { attendanceAlertsFromRegistration } from "./alerts";
import { buildAttendanceMarkId } from "./mark-id";
import { buildSessionPayload } from "./roster";
import { registrationMatchesQuery } from "./search-members";
import { buildSlotStats, buildAttendanceExportCsv } from "./stats";
import { countIsoWeekdayOccurrences, isoWeekdayFromYmd, seasonBoundsYmd } from "./calendar";
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
  });
});

describe("attendance calendar / stats", () => {
  it("liste les créneaux du jeudi depuis la config par défaut", () => {
    const config = getDefaultRegistrationConfig();
    const slots = listSlotsForDate(config, "2026-08-20", 19 * 60);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => slot.weekday === 4)).toBe(true);
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
    expect(stats.players[0]?.expectedCount).toBe(
      countIsoWeekdayOccurrences("2026-08-06", "2026-08-20", 4)
    );
    expect(stats.players[0]?.presentCount).toBe(1);
    expect(stats.walkin).toBe(1);
  });
});

describe("attendance search / export", () => {
  it("matche un nom sans accent", () => {
    expect(registrationMatchesQuery("Béatrice", "Martin", "bea mar")).toBe(true);
    expect(registrationMatchesQuery("Alain", "Dupont", "z")).toBe(false);
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
