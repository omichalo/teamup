import {
  buildOccupancyGroups,
  findOccupancySlot,
  mapRegistrationToOccupancyPerson,
  sortOccupancyPeople,
} from "./build-occupancy";
import { countEnrollmentsBySlotId, readSlotIds } from "./count-enrollments";
import {
  defaultExpandedSiteIds,
  filterOccupancyGroups,
  occupancyGroupStats,
  OCCUPANCY_STATUS_FILTER_OPTIONS,
  patchOccupancyEnrollmentsClosed,
} from "./filter-groups";
import { computeSlotFill, slotFillPercent } from "./fill-rate";
import { buildDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";

describe("computeSlotFill", () => {
  it("laisse le taux vide sans capacité", () => {
    expect(computeSlotFill(12, undefined)).toEqual({
      enrolledCount: 12,
      capacity: undefined,
      rate: null,
      status: "unset",
    });
    expect(slotFillPercent(null)).toBeNull();
  });

  it("calcule le taux et l'état ok / complet / surcharge", () => {
    expect(computeSlotFill(10, 20)).toEqual({
      enrolledCount: 10,
      capacity: 20,
      rate: 0.5,
      status: "ok",
    });
    expect(computeSlotFill(16, 20).status).toBe("near");
    expect(computeSlotFill(19, 20).status).toBe("near");
    expect(computeSlotFill(20, 20).status).toBe("full");
    expect(computeSlotFill(21, 20)).toMatchObject({
      status: "over",
      rate: 1.05,
    });
    expect(slotFillPercent(1.05)).toBe(100);
    expect(slotFillPercent(0.333)).toBe(33);
  });
});

describe("countEnrollmentsBySlotId", () => {
  it("compte un dossier par créneau et ignore les ids dupliqués", () => {
    const counts = countEnrollmentsBySlotId([
      { data: { slotIds: ["a", "b"] } },
      { data: { slotIds: ["a", "a"] } },
      { data: { slotIds: [] } },
      { data: {} },
    ]);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(readSlotIds({ slotIds: ["x", 1, ""] })).toEqual(["x"]);
  });
});

describe("buildOccupancyGroups", () => {
  it("attache le compteur et la capacité du catalogue", () => {
    const config = buildDefaultRegistrationConfig();
    const firstSite = config.sites[0];
    const firstSlot = firstSite?.slots[0];
    expect(firstSite && firstSlot).toBeTruthy();
    if (!firstSite || !firstSlot) {
      return;
    }
    firstSlot.capacity = 18;
    const groups = buildOccupancyGroups(
      config,
      new Map([[firstSlot.id, 20]])
    );
    const found = findOccupancySlot(groups, firstSlot.id);
    expect(found).toMatchObject({
      slotId: firstSlot.id,
      siteId: firstSite.id,
      enrolledCount: 20,
      capacity: 18,
      status: "over",
      enrollmentsClosed: false,
    });
    expect(findOccupancySlot(groups, "inconnu")).toBeNull();
  });
});

describe("occupancy people", () => {
  it("trie par nom et reprend les alertes du pointage", () => {
    const leo = mapRegistrationToOccupancyPerson("r2", {
      firstName: "Léo",
      lastName: "Martin",
      birthDate: "2014-01-01",
      status: "paid",
      paymentStatus: "paid",
      medicalCertificateDeclaration: "under_40_all_no",
      ppsFollowUpStatus: "not_applicable",
    });
    const ana = mapRegistrationToOccupancyPerson("r1", {
      firstName: "Ana",
      lastName: "Dupont",
      status: "submitted",
      paymentStatus: "waiting_payment",
      medicalCertificateDeclaration: "adult_certificate_required",
      medicalCertificateStatus: "required_not_received",
      birthDate: "1990-01-01",
    });
    expect(ana.alerts).toEqual(["unpaid", "certificate"]);
    expect(sortOccupancyPeople([leo, ana]).map((person) => person.displayName)).toEqual([
      "Ana Dupont",
      "Léo Martin",
    ]);
  });
});

describe("filterOccupancyGroups", () => {
  const groups = buildOccupancyGroups(buildDefaultRegistrationConfig(), new Map());

  it("reflète le catalogue club (plusieurs lieux, dizaines de créneaux)", () => {
    const slotCount = groups.reduce((sum, group) => sum + group.slots.length, 0);
    expect(groups.length).toBeGreaterThanOrEqual(5);
    expect(slotCount).toBeGreaterThanOrEqual(30);
  });

  it("filtre par statut et par texte, et n'ouvre par défaut que les surcharges", () => {
    const first = groups[0];
    expect(first).toBeTruthy();
    if (!first) {
      return;
    }
    const overloaded = {
      ...first,
      slots: first.slots.map((slot, index) =>
        index === 0 ? { ...slot, status: "over" as const, enrolledCount: 20, capacity: 10, rate: 2 } : slot
      ),
    };
    const withOver = [overloaded, ...groups.slice(1)];
    expect(defaultExpandedSiteIds(withOver)).toEqual(new Set([first.siteId]));
    expect(occupancyGroupStats(overloaded).over).toBe(1);

    const byStatus = filterOccupancyGroups(withOver, { status: "over", query: "" });
    expect(byStatus).toHaveLength(1);
    expect(byStatus[0]?.slots).toHaveLength(1);

    const needle = first.siteLabel.slice(0, 6).toLowerCase();
    const byQuery = filterOccupancyGroups(groups, { status: "all", query: needle });
    expect(byQuery.some((group) => group.siteId === first.siteId)).toBe(true);
  });

  it("met à jour le marquage de fermeture des adhésions", () => {
    const first = groups[0]?.slots[0];
    expect(first).toBeTruthy();
    if (!first) {
      return;
    }
    const patched = patchOccupancyEnrollmentsClosed(groups, first.slotId, true);
    const patchedGroup = patched[0];
    expect(patchedGroup?.slots[0]?.enrollmentsClosed).toBe(true);
    expect(patchedGroup).toBeTruthy();
    if (!patchedGroup) {
      return;
    }
    expect(occupancyGroupStats(patchedGroup).enrollmentsClosed).toBeGreaterThanOrEqual(1);
  });

  it("explique chaque filtre de statut", () => {
    const helps = Object.fromEntries(
      OCCUPANCY_STATUS_FILTER_OPTIONS.map((option) => [option.value, option.help])
    );
    expect(helps.all).toMatch(/tous les créneaux/i);
    expect(helps.over).toMatch(/plus d'inscrits que la capacité/i);
    expect(helps.full).toMatch(/autant d'inscrits/i);
    expect(helps.near).toMatch(/80 %/i);
    expect(helps.ok).toMatch(/80 %/i);
    expect(helps.unset).toMatch(/aucune capacité/i);
  });
});
