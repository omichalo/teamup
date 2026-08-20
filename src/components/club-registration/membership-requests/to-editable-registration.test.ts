import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import type { PaymentAid, RegistrationPayment } from "@/lib/club-registration/payment/types";
import { buildManagerRegistrationSavePayload } from "./build-manager-registration-save-payload";
import {
  resolveRegistrationPaymentAids,
  toEditableRegistration,
} from "./to-editable-registration";
import type { RegistrationDetail } from "./types";

const TEST_CONFIG = {
  sections: [],
  sites: [],
  competitions: [],
  competitionBundles: [],
  aidRules: [],
  jersey: { optionalPriceCents: 0 },
  uiCopy: { jerseySizes: ["S"] },
  stripePresentation: { lineItems: [] },
  version: 1,
} as never;

describe("resolveRegistrationPaymentAids", () => {
  it("prefers top-level paymentAids when present", () => {
    const topLevel: PaymentAid[] = [
      { type: "pass_sport", label: "Pass Sport", amountCents: 5000 },
    ];
    const payment = {
      aids: [{ type: "other", label: "Autre", amountCents: 1000 }],
    } as RegistrationPayment;

    expect(
      resolveRegistrationPaymentAids({ paymentAids: topLevel }, payment)
    ).toEqual(normalizePaymentAidList(topLevel));
  });

  it("falls back to payment.aids after submit persist", () => {
    const payment = {
      aids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 5000 }],
    } as RegistrationPayment;

    expect(resolveRegistrationPaymentAids({}, payment)).toEqual(
      normalizePaymentAidList(payment.aids)
    );
  });

  it("returns empty list when no aids are stored", () => {
    expect(resolveRegistrationPaymentAids({}, null)).toEqual([]);
  });
});

describe("toEditableRegistration", () => {
  it("hydrates ffttLicense from lookup when top-level field is missing", () => {
    const registration: RegistrationDetail = {
      id: "r1",
      ffttLicenseLookup: { licence: "12345678", nomClub: "SQY Ping" },
    };

    const form = toEditableRegistration(registration, TEST_CONFIG, null);

    expect(form.ffttLicense).toBe("12345678");
    expect(form.ffttLicenseLookup).toEqual({
      licence: "12345678",
      nomClub: "SQY Ping",
    });
  });

  it("normalise le suivi Critérium fédéral selon les compétitions", () => {
    const withoutCriterium = toEditableRegistration(
      { id: "r1", competitionIds: ["championnat_jeunes"] },
      TEST_CONFIG,
      null
    );
    expect(withoutCriterium.criteriumFederalRegistrationStatus).toBe("not_applicable");

    const withCriterium = toEditableRegistration(
      {
        id: "r2",
        competitionIds: ["criterium_federal_seniors"],
        criteriumFederalRegistrationStatus: "validated",
      },
      TEST_CONFIG,
      null
    );
    expect(withCriterium.criteriumFederalRegistrationStatus).toBe("validated");
  });

  it("normalise le suivi de remise du maillot selon les options", () => {
    const withoutJersey = toEditableRegistration(
      { id: "r1", wantsCompetitorExtras: false, wantsOptionalJersey: false },
      TEST_CONFIG,
      null
    );
    expect(withoutJersey.jerseyFollowUpStatus).toBe("not_applicable");

    const withJersey = toEditableRegistration(
      {
        id: "r2",
        wantsCompetitorExtras: true,
        jerseyFollowUpStatus: "given",
      },
      TEST_CONFIG,
      null
    );
    expect(withJersey.jerseyFollowUpStatus).toBe("given");
  });

  it("normalise le suivi d’attestation d’inscription selon la demande", () => {
    const withoutCertificate = toEditableRegistration(
      { id: "r1", wantsRegistrationCertificate: false },
      TEST_CONFIG,
      null
    );
    expect(withoutCertificate.registrationCertificateFollowUpStatus).toBe("not_applicable");

    const withCertificate = toEditableRegistration(
      {
        id: "r2",
        wantsRegistrationCertificate: true,
        registrationCertificateFollowUpStatus: "sent",
      },
      TEST_CONFIG,
      null
    );
    expect(withCertificate.registrationCertificateFollowUpStatus).toBe("sent");
  });
});

describe("buildManagerRegistrationSavePayload", () => {
  it("envoie le suivi Critérium fédéral normalisé", () => {
    const form = toEditableRegistration(
      {
        id: "r1",
        competitionIds: ["criterium_federal_jeunes"],
        criteriumFederalRegistrationStatus: "not_applicable",
      },
      TEST_CONFIG,
      null
    );

    expect(buildManagerRegistrationSavePayload(form).criteriumFederalRegistrationStatus).toBe(
      "to_do"
    );
  });

  it("envoie le suivi de remise du maillot normalisé", () => {
    const form = toEditableRegistration(
      {
        id: "r1",
        wantsOptionalJersey: true,
        jerseyFollowUpStatus: "not_applicable",
      },
      TEST_CONFIG,
      null
    );

    expect(buildManagerRegistrationSavePayload(form).jerseyFollowUpStatus).toBe("to_do");
  });

  it("envoie le suivi d’attestation d’inscription normalisé", () => {
    const form = toEditableRegistration(
      {
        id: "r1",
        wantsRegistrationCertificate: true,
        registrationCertificateFollowUpStatus: "not_applicable",
      },
      TEST_CONFIG,
      null
    );

    expect(buildManagerRegistrationSavePayload(form).registrationCertificateFollowUpStatus).toBe(
      "to_do"
    );
  });
});

