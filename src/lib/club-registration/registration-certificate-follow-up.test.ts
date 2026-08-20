import {
  initialRegistrationCertificateFollowUpStatus,
  isRegistrationCertificateRequested,
  matchesRegistrationCertificateFollowUpFilter,
  normalizeRegistrationCertificateFollowUpStatus,
  resolveManagedListRegistrationCertificateFollowUpFilter,
  resolveRegistrationCertificateFollowUpStatusForPatch,
} from "./registration-certificate-follow-up";

describe("registration-certificate-follow-up", () => {
  it("détecte une attestation demandée", () => {
    expect(isRegistrationCertificateRequested(true)).toBe(true);
    expect(isRegistrationCertificateRequested(false)).toBe(false);
    expect(isRegistrationCertificateRequested(undefined)).toBe(false);
  });

  it("initialise À faire seulement si l’attestation est demandée", () => {
    expect(initialRegistrationCertificateFollowUpStatus(true)).toBe("to_do");
    expect(initialRegistrationCertificateFollowUpStatus(false)).toBe("not_applicable");
  });

  it("conserve Envoyée tant que la demande reste cochée", () => {
    expect(normalizeRegistrationCertificateFollowUpStatus("sent", true)).toBe("sent");
    expect(normalizeRegistrationCertificateFollowUpStatus("to_do", true)).toBe("to_do");
  });

  it("repasse à non applicable si la demande est retirée", () => {
    expect(normalizeRegistrationCertificateFollowUpStatus("sent", false)).toBe(
      "not_applicable"
    );
  });

  it("remet À faire si le statut stocké est incohérent", () => {
    expect(normalizeRegistrationCertificateFollowUpStatus("not_applicable", true)).toBe(
      "to_do"
    );
    expect(normalizeRegistrationCertificateFollowUpStatus(undefined, true)).toBe("to_do");
  });

  it("préserve Envoyée au PATCH si on recoche sans renvoyer le statut", () => {
    expect(
      resolveRegistrationCertificateFollowUpStatusForPatch({
        wantsCertificate: true,
        currentStatus: "sent",
        requestedStatus: undefined,
      })
    ).toBe("sent");
  });

  it("écrit non applicable au PATCH si la demande est retirée", () => {
    expect(
      resolveRegistrationCertificateFollowUpStatusForPatch({
        wantsCertificate: false,
        currentStatus: "sent",
        requestedStatus: "sent",
      })
    ).toBe("not_applicable");
  });

  it("filtre la liste secrétariat sur À faire / Envoyée", () => {
    expect(resolveManagedListRegistrationCertificateFollowUpFilter(null)).toBe("all");
    expect(resolveManagedListRegistrationCertificateFollowUpFilter("not_applicable")).toBe(
      "all"
    );
    expect(resolveManagedListRegistrationCertificateFollowUpFilter("sent")).toBe("sent");

    const awaiting = {
      wantsRegistrationCertificate: true,
      registrationCertificateFollowUpStatus: "to_do",
    };
    const done = {
      wantsRegistrationCertificate: true,
      registrationCertificateFollowUpStatus: "sent",
    };
    const unused = {
      wantsRegistrationCertificate: false,
      registrationCertificateFollowUpStatus: "sent",
    };

    expect(matchesRegistrationCertificateFollowUpFilter(awaiting, "all")).toBe(true);
    expect(matchesRegistrationCertificateFollowUpFilter(awaiting, "to_do")).toBe(true);
    expect(matchesRegistrationCertificateFollowUpFilter(awaiting, "sent")).toBe(false);
    expect(matchesRegistrationCertificateFollowUpFilter(done, "sent")).toBe(true);
    expect(matchesRegistrationCertificateFollowUpFilter(unused, "to_do")).toBe(false);
    expect(matchesRegistrationCertificateFollowUpFilter(unused, "sent")).toBe(false);
  });
});
