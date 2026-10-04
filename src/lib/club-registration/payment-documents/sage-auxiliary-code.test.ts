import {
  deriveLegacySageAuxiliaryCode,
  formatAllocatedSageAuxiliaryCode,
  isValidSageAuxiliaryCode,
  readFfttLicenseDigitsFromRegistration,
  readPersistedSageAuxiliaryCode,
} from "./sage-auxiliary-code";

describe("sage-auxiliary-code", () => {
  it("formate une séquence A opaque", () => {
    expect(formatAllocatedSageAuxiliaryCode(1)).toBe("A000001");
    expect(formatAllocatedSageAuxiliaryCode(42)).toBe("A000042");
  });

  it("valide les codes A, C legacy et P legacy", () => {
    expect(isValidSageAuxiliaryCode("A000001")).toBe(true);
    expect(isValidSageAuxiliaryCode("C078101965")).toBe(true);
    expect(isValidSageAuxiliaryCode("PABC123DEF456")).toBe(true);
    expect(isValidSageAuxiliaryCode("X123")).toBe(false);
  });

  it("lit le code persisté", () => {
    expect(readPersistedSageAuxiliaryCode({ sageAuxiliaryCode: "A000009" })).toBe(
      "A000009"
    );
    expect(readPersistedSageAuxiliaryCode({})).toBeNull();
  });

  it("dérive le legacy C/P pour backfill", () => {
    expect(
      deriveLegacySageAuxiliaryCode({ ffttLicense: "078101965" }, "reg-1")
    ).toBe("C078101965");
    expect(deriveLegacySageAuxiliaryCode({}, "abc123def456zzz")).toBe(
      "PABC123DEF456"
    );
  });

  it("extrait la licence digits", () => {
    expect(
      readFfttLicenseDigitsFromRegistration({
        ffttLicenseLookup: { licence: "78101965" },
      })
    ).toBe("78101965");
  });
});
