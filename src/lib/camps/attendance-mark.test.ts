import {
  buildCampAttendanceMarkId,
  campAttendancePersonKey,
  normalizeCampAttendanceMark,
} from "./attendance-mark";

describe("camp attendance mark ids", () => {
  it("builds enrolled legacy-compatible id", () => {
    expect(
      buildCampAttendanceMarkId({
        slotId: "slot1",
        kind: "enrolled",
        campRegistrationId: "regA",
      })
    ).toBe("slot1__regA");
  });

  it("builds member_walkin and external ids", () => {
    expect(
      buildCampAttendanceMarkId({
        slotId: "slot1",
        kind: "member_walkin",
        clubRegistrationId: "clubA",
      })
    ).toBe("slot1__club_clubA");
    expect(
      buildCampAttendanceMarkId({
        slotId: "slot1",
        kind: "external",
        externalId: "abc",
      })
    ).toBe("slot1__ext_abc");
  });

  it("normalizes legacy enrolled documents without kind", () => {
    const mark = normalizeCampAttendanceMark("slot1__regA", {
      campId: "camp1",
      slotId: "slot1",
      date: "2026-10-20",
      campRegistrationId: "regA",
      displayName: "Ada Lovelace",
      markedByUid: "u1",
      markedAt: "2026-10-20T10:00:00.000Z",
    });
    expect(mark.kind).toBe("enrolled");
    expect(mark.campRegistrationId).toBe("regA");
    expect(campAttendancePersonKey(mark)).toBe("camp_regA");
  });

  it("normalizes external from id suffix when fields missing", () => {
    const mark = normalizeCampAttendanceMark("slot1__ext_xyz", {
      campId: "camp1",
      slotId: "slot1",
      date: "2026-10-20",
      kind: "external",
      displayName: "Ext Test",
      markedByUid: "u1",
      markedAt: "2026-10-20T10:00:00.000Z",
    });
    expect(mark.kind).toBe("external");
    expect(mark.externalId).toBe("xyz");
    expect(campAttendancePersonKey(mark)).toBe("camp_ext_xyz");
  });
});
