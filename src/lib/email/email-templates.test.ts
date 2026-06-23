import { SQYPING_COLORS, SQYPING_SECRETARIAT_EMAIL } from "@/lib/email/brand";
import { buildVerificationEmail } from "@/lib/email/auth-emails";
import { buildPasswordResetEmail } from "@/lib/email/auth-emails";
import { buildSqyPingEmailLayout } from "@/lib/email/layout";
import { buildPaymentRequestEmail } from "@/lib/email/payment-email";
import { adaptEmailHtmlForFilePreview } from "@/lib/email/preview";
import { buildPaymentConfirmedEmail } from "@/lib/email/payment-confirmed-email";
import { buildPaymentInstructionsEmail } from "@/lib/email/payment-instructions-email";
import { BNPL_COPY_TEST_MARKER } from "@/lib/club-registration/payment/bnpl-checkout-copy";
import { CHECK_PAYABLE_TO } from "@/lib/club-registration/payment-constants";
import { buildRegistrationSubmittedEmail } from "@/lib/email/registration-submitted-email";
import type { PriceQuote } from "@/lib/pricing/types";

const APP_ORIGIN = "https://teamup.sqyping.fr";

describe("buildSqyPingEmailLayout", () => {
  it("injecte les couleurs de la charte SQY Ping", () => {
    const html = buildSqyPingEmailLayout({
      title: "Test",
      bodyHtml: "<p>Corps</p>",
      appOrigin: APP_ORIGIN,
      primaryAction: { label: "Action", url: "https://example.com" },
    });

    expect(html).toContain(SQYPING_COLORS.primary.main);
    expect(html).toContain(SQYPING_COLORS.surface.background);
    expect(html).toContain("Figtree");
    expect(html).toContain(APP_ORIGIN);
    expect(html).toContain("cid:logo-sqyping");
  });

  it("accepte une source de logo personnalisée pour la prévisualisation", () => {
    const html = buildSqyPingEmailLayout({
      title: "Test",
      bodyHtml: "<p>Corps</p>",
      appOrigin: APP_ORIGIN,
      logoSrc: "../../public/sqyping-logo.jpg",
    });

    expect(html).toContain('src="../../public/sqyping-logo.jpg"');
    expect(html).not.toContain("cid:logo-sqyping");
  });
});

describe("adaptEmailHtmlForFilePreview", () => {
  it("remplace le CID logo par un chemin fichier", () => {
    const html = buildSqyPingEmailLayout({
      title: "Test",
      bodyHtml: "<p>Corps</p>",
      appOrigin: APP_ORIGIN,
    });

    const adapted = adaptEmailHtmlForFilePreview(html, "/logo.jpg");
    expect(adapted).toContain('src="/logo.jpg"');
    expect(adapted).not.toContain("cid:logo-sqyping");
  });
});

describe("buildVerificationEmail", () => {
  it("produit un HTML et un texte avec le lien d'action", () => {
    const link = "https://teamup.sqyping.fr/auth/verify-email?oobCode=abc";
    const { html, text } = buildVerificationEmail({
      actionUrl: link,
      appOrigin: APP_ORIGIN,
    });

    expect(html).toContain(link);
    expect(html).toContain("Vérifier mon adresse e-mail");
    expect(text).toContain(link);
    expect(text).toContain("SQY Ping - Team Up");
  });
});

describe("buildPasswordResetEmail", () => {
  it("inclut un encart d'avertissement", () => {
    const link = "https://teamup.sqyping.fr/reset-password?oobCode=xyz";
    const { html, text } = buildPasswordResetEmail({
      actionUrl: link,
      appOrigin: APP_ORIGIN,
    });

    expect(html).toContain("1 heure");
    expect(html).toContain(SQYPING_COLORS.secondary.main);
    expect(html).toContain("Réinitialiser mon mot de passe");
    expect(html).toContain(SQYPING_SECRETARIAT_EMAIL);
    expect(text).toContain(SQYPING_SECRETARIAT_EMAIL);
  });
});

describe("buildRegistrationSubmittedEmail", () => {
  it("inclut le lien vers Mes inscriptions", () => {
    const { html, text } = buildRegistrationSubmittedEmail({
      adherentName: "Marie Dupont",
      registrationId: "reg_abc",
      appOrigin: APP_ORIGIN,
    });

    expect(html).toContain("Suivre mon dossier");
    expect(html).toContain("created=reg_abc");
    expect(text).toContain(`${APP_ORIGIN}/club/mes-inscriptions?created=reg_abc`);
  });
});

describe("buildPaymentInstructionsEmail", () => {
  it("détaille les consignes pour un règlement par chèque", () => {
    const { html, text } = buildPaymentInstructionsEmail({
      adherentName: "Marie Dupont",
      amountCents: 12000,
      registrationId: "reg_chq",
      appOrigin: APP_ORIGIN,
      paymentMethod: "cheque",
      paymentInstallments: 2,
      expectedPayments: [
        {
          id: "ep1",
          method: "cheque",
          label: "Chèque 1/2",
          expectedAmountCents: 6000,
          status: "expected",
        },
      ],
      quote: null,
    });

    expect(html).toContain(CHECK_PAYABLE_TO);
    expect(html).toContain("Chèque 1/2");
    expect(html).toContain(SQYPING_SECRETARIAT_EMAIL);
    expect(text).toContain(CHECK_PAYABLE_TO);
    expect(text).toContain(SQYPING_SECRETARIAT_EMAIL);
  });

  it("mentionne le complément pour les chèques vacances", () => {
    const { html } = buildPaymentInstructionsEmail({
      adherentName: "Lucas",
      amountCents: 15000,
      registrationId: "reg_cv",
      appOrigin: APP_ORIGIN,
      paymentMethod: "holiday_vouchers",
      paymentInstallments: 1,
      expectedPayments: [],
      holidayVoucherAmountCents: 10000,
      remainingPaymentMethod: "cheque",
    });

    expect(html).toContain("chèques vacances");
    expect(html).toContain("Chèque");
  });

  it("mentionne le BNPL pour la carte bancaire", () => {
    const { html, text } = buildPaymentInstructionsEmail({
      adherentName: "Paul",
      amountCents: 25_000,
      registrationId: "reg_cb",
      appOrigin: APP_ORIGIN,
      paymentMethod: "card",
      paymentInstallments: 1,
      expectedPayments: [],
    });

    expect(html).toContain(BNPL_COPY_TEST_MARKER);
    expect(html).toContain("lien de paiement Stripe");
    expect(text).toContain(BNPL_COPY_TEST_MARKER);
  });
});

describe("buildPaymentConfirmedEmail", () => {
  it("mentionne la facture pour un paiement Stripe", () => {
    const { html, text } = buildPaymentConfirmedEmail({
      adherentName: "Marie Dupont",
      amountCents: 15000,
      registrationId: "reg_paid",
      appOrigin: APP_ORIGIN,
      source: "stripe",
      invoiceAvailable: true,
    });

    expect(html).toContain("Stripe");
    expect(html).toContain("facture");
    expect(html).toContain("150,00");
    expect(html).toContain(SQYPING_SECRETARIAT_EMAIL);
    expect(text).toContain("facture");
    expect(text).toContain(SQYPING_SECRETARIAT_EMAIL);
  });

  it("adapte le message pour un encaissement secrétariat", () => {
    const { html } = buildPaymentConfirmedEmail({
      adherentName: "Paul Martin",
      amountCents: 8000,
      registrationId: "reg_manual",
      appOrigin: APP_ORIGIN,
      source: "secretariat",
    });

    expect(html).toContain("secrétariat");
    expect(html).not.toContain("facture");
  });
});

describe("buildPaymentRequestEmail", () => {
  const quote: PriceQuote = {
    catalogVersion: "v1",
    segmentLabel: "Loisir",
    subtotalCents: 15000,
    totalCents: 15000,
    warnings: [],
    requiresAdminReview: false,
    lines: [
      {
        id: "cotisation",
        label: "Cotisation loisir",
        amountCents: 12000,
        kind: "membership",
        source: "catalog",
      },
      {
        id: "licence",
        label: "Licence FFTT",
        amountCents: 3000,
        kind: "fftt_license",
        source: "catalog",
      },
    ],
  };

  it("affiche un tableau détaillé quand un devis est fourni", () => {
    const checkoutUrl = "https://checkout.stripe.com/pay/cs_test";
    const { html, text } = buildPaymentRequestEmail({
      adherentName: "Marie Dupont",
      amountCents: 15000,
      checkoutUrl,
      appOrigin: APP_ORIGIN,
      quote,
    });

    expect(html).toContain("Marie Dupont");
    expect(html).toContain("Cotisation loisir");
    expect(html).toContain("150,00");
    expect(html).toContain(checkoutUrl);
    expect(html).toContain("Payer");
    expect(html).toContain(BNPL_COPY_TEST_MARKER);
    expect(html).toContain(SQYPING_SECRETARIAT_EMAIL);
    expect(text).toContain("Cotisation loisir");
    expect(text).toContain(BNPL_COPY_TEST_MARKER);
    expect(text).toContain(SQYPING_SECRETARIAT_EMAIL);
    expect(text).toContain(checkoutUrl);
  });

  it("fonctionne sans devis détaillé (mode legacy)", () => {
    const { html } = buildPaymentRequestEmail({
      adherentName: "Paul Martin",
      amountCents: 8000,
      checkoutUrl: "https://checkout.stripe.com/pay/cs_legacy",
      appOrigin: APP_ORIGIN,
      quote: null,
    });

    expect(html).toContain("80,00");
    expect(html).not.toContain("Détail de votre adhésion");
  });
});
