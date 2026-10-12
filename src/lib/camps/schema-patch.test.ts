import { campPatchSchema } from "./schema";

describe("campPatchSchema", () => {
  it("ne remplit pas sites/pricing quand seul le statut est envoyé", () => {
    const parsed = campPatchSchema.safeParse({ status: "open" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({ status: "open" });
    expect(parsed.data.sites).toBeUndefined();
    expect(parsed.data.pricing).toBeUndefined();
  });
});
