import {
  canApplyPpsFollowUpEvent,
  initialPpsFollowUpStatus,
  isPpsFollowUpApplicable,
  matchesPpsFollowUpFilter,
  nextPpsFollowUpStatus,
  normalizePpsFollowUpNote,
  normalizePpsFollowUpStatus,
  parsePpsFollowUpEvents,
  resolveManagedListPpsFollowUpFilter,
} from "@/lib/club-registration/pps-follow-up";

describe("pps-follow-up", () => {
  it("détecte les déclarations soumises au suivi PPS", () => {
    expect(isPpsFollowUpApplicable("adult_pps_declared")).toBe(true);
    expect(isPpsFollowUpApplicable("under_40_all_no")).toBe(true);
    expect(isPpsFollowUpApplicable("adult_certificate_required")).toBe(false);
    expect(initialPpsFollowUpStatus("adult_pps_declared")).toBe("expected");
    expect(initialPpsFollowUpStatus("minor_all_no")).toBe("not_applicable");
  });

  it("n’applique pas le suivi PPS aux mineurs de saison", () => {
    expect(
      isPpsFollowUpApplicable("adult_pps_declared", "2008-01-15", "2025-2026")
    ).toBe(false);
    expect(
      isPpsFollowUpApplicable("under_40_all_no", "2012-06-01", "2025-2026")
    ).toBe(false);
    expect(
      isPpsFollowUpApplicable("under_40_all_no", "2000-04-12", "2025-2026")
    ).toBe(true);
    expect(
      initialPpsFollowUpStatus("under_40_all_no", "2012-06-01", "2025-2026")
    ).toBe("not_applicable");
    expect(
      normalizePpsFollowUpStatus("expected", "under_40_all_no", "2012-06-01")
    ).toBe("not_applicable");
  });

  it("normalise le statut selon la déclaration", () => {
    expect(normalizePpsFollowUpStatus("ok", "adult_pps_declared")).toBe("ok");
    expect(
      normalizePpsFollowUpStatus("ok", "adult_certificate_required")
    ).toBe("not_applicable");
    expect(normalizePpsFollowUpStatus("invalid", "adult_pps_declared")).toBe(
      "expected"
    );
  });

  it("applique les transitions d’événements", () => {
    expect(nextPpsFollowUpStatus("expected", "control_incomplete")).toBe(
      "checked_incomplete"
    );
    expect(nextPpsFollowUpStatus("checked_incomplete", "reminder")).toBe(
      "checked_incomplete"
    );
    expect(nextPpsFollowUpStatus("expected", "marked_ok")).toBe("ok");
    expect(nextPpsFollowUpStatus("ok", "reopened")).toBe("expected");
    expect(nextPpsFollowUpStatus("expected", "reopened")).toBeNull();
    expect(canApplyPpsFollowUpEvent("not_applicable", "marked_ok")).toBe(false);
    expect(canApplyPpsFollowUpEvent("ok", "reopened")).toBe(true);
  });

  it("valide les notes", () => {
    expect(normalizePpsFollowUpNote(undefined)).toBeNull();
    expect(normalizePpsFollowUpNote("  ok  ")).toBe("ok");
    expect(normalizePpsFollowUpNote("x".repeat(501))).toEqual({
      error: expect.stringContaining("trop longue"),
    });
  });

  it("parse les événements stockés", () => {
    expect(
      parsePpsFollowUpEvents([
        {
          id: "e1",
          type: "reminder",
          note: "Appel",
          at: "2026-08-15T10:00:00.000Z",
          byUid: "u1",
        },
        { id: "bad" },
      ])
    ).toEqual([
      {
        id: "e1",
        type: "reminder",
        note: "Appel",
        at: "2026-08-15T10:00:00.000Z",
        byUid: "u1",
      },
    ]);
  });

  it("filtre la liste managée", () => {
    expect(resolveManagedListPpsFollowUpFilter("ok")).toBe("ok");
    expect(resolveManagedListPpsFollowUpFilter("not_applicable")).toBe("all");
    expect(matchesPpsFollowUpFilter("expected", "all")).toBe(true);
    expect(matchesPpsFollowUpFilter("expected", "ok")).toBe(false);
  });
});
