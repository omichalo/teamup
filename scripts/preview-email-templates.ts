#!/usr/bin/env node
/**
 * Génère des fichiers HTML de prévisualisation pour les e-mails transactionnels.
 *
 * Usage :
 *   npm run email:preview
 *   npm run email:preview -- --open
 *
 * Sortie : emails/preview/ (index + un fichier par variante)
 */

import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { buildPasswordResetEmail, buildVerificationEmail } from "@/lib/email/auth-emails";
import { buildPaymentInstructionsEmail } from "@/lib/email/payment-instructions-email";
import { buildPaymentConfirmedEmail } from "@/lib/email/payment-confirmed-email";
import { buildPaymentRequestEmail } from "@/lib/email/payment-email";
import { buildRegistrationSubmittedEmail } from "@/lib/email/registration-submitted-email";
import {
  EMAIL_PREVIEW_APP_ORIGIN,
  EMAIL_PREVIEW_VARIANTS,
  adaptEmailHtmlForFilePreview,
  buildEmailPreviewIndexHtml,
} from "@/lib/email/preview";
import type { PriceQuote } from "@/lib/pricing/types";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTPUT_DIR = join(ROOT, "emails", "preview");

const SAMPLE_ACTION_URL = `${EMAIL_PREVIEW_APP_ORIGIN}/auth/verify-email?oobCode=preview-sample`;
const SAMPLE_RESET_URL = `${EMAIL_PREVIEW_APP_ORIGIN}/reset-password?oobCode=preview-sample`;
const SAMPLE_CHECKOUT_URL = "https://checkout.stripe.com/c/pay/preview-sample";

const SAMPLE_QUOTE: PriceQuote = {
  catalogVersion: "preview",
  segmentLabel: "Loisir",
  subtotalCents: 18700,
  totalCents: 18700,
  warnings: [],
  requiresAdminReview: false,
  lines: [
    {
      id: "membership",
      kind: "membership",
      label: "Cotisation loisir",
      amountCents: 12000,
      source: "catalog",
    },
    {
      id: "fftt",
      kind: "fftt_license",
      label: "Licence FFTT",
      amountCents: 4200,
      source: "catalog",
    },
    {
      id: "jersey",
      kind: "addon",
      label: "Maillot d'entraînement",
      amountCents: 2500,
      source: "catalog",
    },
  ],
};

async function writePreview(filename: string, html: string): Promise<void> {
  const adapted = adaptEmailHtmlForFilePreview(html);
  await writeFile(join(OUTPUT_DIR, filename), adapted, "utf8");
}

async function maybeOpenIndex(shouldOpen: boolean): Promise<void> {
  if (!shouldOpen) {
    return;
  }

  const indexPath = join(OUTPUT_DIR, "index.html");
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      await execFileAsync("open", [indexPath]);
      return;
    }
    if (platform === "win32") {
      await execFileAsync("cmd", ["/c", "start", "", indexPath]);
      return;
    }
    await execFileAsync("xdg-open", [indexPath]);
  } catch {
    console.warn(`Impossible d'ouvrir automatiquement ${indexPath}`);
  }
}

async function main(): Promise<void> {
  const shouldOpen = process.argv.includes("--open");

  await mkdir(OUTPUT_DIR, { recursive: true });

  await writePreview("registration-submitted.html", buildRegistrationSubmittedEmail({
    adherentName: "Marie Dupont",
    registrationId: "preview-registration-id",
    appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
  }).html);

  const verification = buildVerificationEmail({
    actionUrl: SAMPLE_ACTION_URL,
    appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
  });
  await writePreview("verification.html", verification.html);

  const passwordReset = buildPasswordResetEmail({
    actionUrl: SAMPLE_RESET_URL,
    appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
  });
  await writePreview("password-reset.html", passwordReset.html);

  await writePreview(
    "payment-instructions-cheque.html",
    buildPaymentInstructionsEmail({
      adherentName: "Marie Dupont",
      amountCents: SAMPLE_QUOTE.totalCents,
      registrationId: "preview-registration-id",
      appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
      paymentMethod: "cheque",
      paymentInstallments: 3,
      expectedPayments: [
        {
          id: "ep1",
          method: "cheque",
          label: "Chèque 1/3",
          expectedAmountCents: 6234,
          status: "expected",
        },
        {
          id: "ep2",
          method: "cheque",
          label: "Chèque 2/3",
          expectedAmountCents: 6233,
          status: "expected",
        },
        {
          id: "ep3",
          method: "cheque",
          label: "Chèque 3/3",
          expectedAmountCents: 6233,
          status: "expected",
        },
      ],
      quote: SAMPLE_QUOTE,
      paymentNote: "Je pourrai déposer les chèques en fin de semaine.",
    }).html
  );

  await writePreview(
    "payment-instructions-holiday.html",
    buildPaymentInstructionsEmail({
      adherentName: "Lucas Bernard",
      amountCents: 15000,
      registrationId: "preview-registration-id",
      appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
      paymentMethod: "holiday_vouchers",
      paymentInstallments: 1,
      expectedPayments: [],
      holidayVoucherAmountCents: 10000,
      remainingPaymentMethod: "cheque",
      quote: null,
    }).html
  );

  await writePreview(
    "payment-instructions-card-multi.html",
    buildPaymentInstructionsEmail({
      adherentName: "Paul Martin",
      amountCents: 12000,
      registrationId: "preview-registration-id",
      appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
      paymentMethod: "card",
      paymentInstallments: 4,
      expectedPayments: [
        {
          id: "ep1",
          method: "card",
          label: "CB 1/4",
          expectedAmountCents: 3000,
          status: "expected",
        },
        {
          id: "ep2",
          method: "card",
          label: "CB 2/4",
          expectedAmountCents: 3000,
          status: "expected",
        },
        {
          id: "ep3",
          method: "card",
          label: "CB 3/4",
          expectedAmountCents: 3000,
          status: "expected",
        },
        {
          id: "ep4",
          method: "card",
          label: "CB 4/4",
          expectedAmountCents: 3000,
          status: "expected",
        },
      ],
      quote: null,
    }).html
  );

  await writePreview(
    "payment-confirmed-stripe.html",
    buildPaymentConfirmedEmail({
      adherentName: "Marie Dupont",
      amountCents: 18700,
      registrationId: "preview-registration-id",
      appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
      source: "stripe",
      invoiceAvailable: true,
    }).html
  );

  await writePreview(
    "payment-confirmed-secretariat.html",
    buildPaymentConfirmedEmail({
      adherentName: "Paul Martin",
      amountCents: 12000,
      registrationId: "preview-registration-id",
      appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
      source: "secretariat",
      invoiceAvailable: false,
    }).html
  );

  const paymentDetailed = buildPaymentRequestEmail({
    adherentName: "Marie Dupont",
    amountCents: SAMPLE_QUOTE.totalCents,
    checkoutUrl: SAMPLE_CHECKOUT_URL,
    appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
    quote: SAMPLE_QUOTE,
  });
  await writePreview("payment-detailed.html", paymentDetailed.html);

  const paymentLegacy = buildPaymentRequestEmail({
    adherentName: "Paul Martin",
    amountCents: 8000,
    checkoutUrl: SAMPLE_CHECKOUT_URL,
    appOrigin: EMAIL_PREVIEW_APP_ORIGIN,
    quote: null,
  });
  await writePreview("payment-legacy.html", paymentLegacy.html);

  await writeFile(
    join(OUTPUT_DIR, "index.html"),
    buildEmailPreviewIndexHtml(EMAIL_PREVIEW_VARIANTS),
    "utf8"
  );

  console.log("E-mails de prévisualisation générés dans emails/preview/");
  for (const variant of EMAIL_PREVIEW_VARIANTS) {
    console.log(`  - ${variant.filename} (${variant.label})`);
  }
  console.log("  - index.html");

  await maybeOpenIndex(shouldOpen);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
