import { campAttendanceMarkBodySchema } from "./camp-attendance-mark-schema";

describe("campAttendanceMarkBodySchema", () => {
  it("accepts enrolled with registrationId alias", () => {
    const parsed = campAttendanceMarkBodySchema.safeParse({
      source: "camp",
      date: "2026-10-20",
      slotId: "slot1",
      kind: "enrolled",
      registrationId: "reg1",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts member_walkin with clubRegistrationId", () => {
    const parsed = campAttendanceMarkBodySchema.safeParse({
      source: "camp",
      date: "2026-10-20",
      slotId: "slot1",
      kind: "member_walkin",
      clubRegistrationId: "club1",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts external create payload", () => {
    const parsed = campAttendanceMarkBodySchema.safeParse({
      source: "camp",
      date: "2026-10-20",
      slotId: "slot1",
      kind: "external",
      external: { firstName: "Jean", lastName: "Test", phone: "0600000000" },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts external delete via markId", () => {
    const parsed = campAttendanceMarkBodySchema.safeParse({
      source: "camp",
      date: "2026-10-20",
      slotId: "slot1",
      kind: "external",
      markId: "slot1__ext_abc",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects enrolled without id", () => {
    const parsed = campAttendanceMarkBodySchema.safeParse({
      source: "camp",
      date: "2026-10-20",
      slotId: "slot1",
      kind: "enrolled",
    });
    expect(parsed.success).toBe(false);
  });
});
