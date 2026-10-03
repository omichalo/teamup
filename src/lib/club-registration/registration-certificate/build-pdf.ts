import fs from "node:fs";
import path from "node:path";
import {
  assertPaymentDocFontsExist,
  PAYMENT_DOC_FONT_BOLD,
  PAYMENT_DOC_FONT_REGULAR,
  PAYMENT_DOC_PAGE_MARGIN,
  registerPaymentDocFonts,
} from "@/lib/club-registration/payment-documents/pdf-kit-shared";
import { REGISTRATION_CERTIFICATE_IDENTITY } from "./identity";
import type { RegistrationCertificateViewModel } from "./types";

/** Hauteur réservée au pied de page (sous la signature). */
const CERTIFICATE_FOOTER_HEIGHT = 96;

function resolveLogoPath(): string {
  return path.join(process.cwd(), ...REGISTRATION_CERTIFICATE_IDENTITY.logoPathRelative);
}

function resolveSignaturePath(): string {
  return path.join(
    process.cwd(),
    ...REGISTRATION_CERTIFICATE_IDENTITY.signaturePathRelative
  );
}

function drawCenteredText(
  doc: PDFKit.PDFDocument,
  text: string,
  y: number,
  options: {
    font?: string;
    fontSize?: number;
    color?: string;
    width?: number;
  } = {}
): number {
  const font = options.font ?? PAYMENT_DOC_FONT_REGULAR;
  const fontSize = options.fontSize ?? 11;
  const color = options.color ?? "#1f2233";
  const width = options.width ?? 595.28 - PAYMENT_DOC_PAGE_MARGIN * 2;
  doc.font(font).fontSize(fontSize).fillColor(color).text(text, PAYMENT_DOC_PAGE_MARGIN, y, {
    width,
    align: "center",
  });
  return doc.y;
}

function drawCertificateFooter(
  doc: PDFKit.PDFDocument,
  contentWidth: number
): void {
  const identity = REGISTRATION_CERTIFICATE_IDENTITY;
  const previousBottomMargin = doc.page.margins.bottom;
  // Même garde-fou que les PDF paiement : éviter un saut de page auto en bas.
  doc.page.margins.bottom = 0;

  const footerTop = doc.page.height - CERTIFICATE_FOOTER_HEIGHT;
  doc
    .save()
    .strokeColor("#D8DCE8")
    .lineWidth(0.8)
    .moveTo(PAYMENT_DOC_PAGE_MARGIN, footerTop)
    .lineTo(PAYMENT_DOC_PAGE_MARGIN + contentWidth, footerTop)
    .stroke()
    .restore();

  let footerY = footerTop + 8;
  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(8)
    .fillColor(identity.primaryColor)
    .text(identity.shortName, PAYMENT_DOC_PAGE_MARGIN, footerY, {
      width: contentWidth,
      lineBreak: false,
    });
  footerY += 12;

  doc
    .font(PAYMENT_DOC_FONT_REGULAR)
    .fontSize(7)
    .fillColor("#525871")
    .text(identity.addressLine, PAYMENT_DOC_PAGE_MARGIN, footerY, {
      width: contentWidth,
      lineBreak: false,
    });
  footerY += 11;

  doc.text(identity.legalDeclaration, PAYMENT_DOC_PAGE_MARGIN, footerY, {
    width: contentWidth,
    lineGap: 1,
  });
  footerY = doc.y + 2;

  doc.text(
    `${identity.siret}  ${identity.ffttAffiliation}`,
    PAYMENT_DOC_PAGE_MARGIN,
    footerY,
    { width: contentWidth, lineBreak: false }
  );
  footerY += 10;

  doc.text(`Site : ${identity.website}`, PAYMENT_DOC_PAGE_MARGIN, footerY, {
    width: contentWidth,
    lineBreak: false,
  });

  doc.page.margins.bottom = previousBottomMargin;
}

/** PDF attestation d’inscription — layout certificat (logo centré, prose, signature). */
export async function buildRegistrationCertificatePdf(
  viewModel: RegistrationCertificateViewModel
): Promise<Buffer> {
  assertPaymentDocFontsExist();
  const signaturePath = resolveSignaturePath();
  if (!fs.existsSync(signaturePath)) {
    throw new Error(
      "Signature de l'attestation introuvable (public/club-registration/registration-certificate-signature.jpg)."
    );
  }

  const { default: PDFDocument } = await import("pdfkit");
  const identity = REGISTRATION_CERTIFICATE_IDENTITY;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAYMENT_DOC_PAGE_MARGIN,
      info: {
        Title: viewModel.title,
        Author: viewModel.clubName,
        Subject: `Attestation d'inscription — ${viewModel.adherentName}`,
      },
    });
    registerPaymentDocFonts(doc);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const contentWidth = 595.28 - PAYMENT_DOC_PAGE_MARGIN * 2;
      const contentBottom = doc.page.height - CERTIFICATE_FOOTER_HEIGHT - 12;
      let y = PAYMENT_DOC_PAGE_MARGIN;

      const logoPath = resolveLogoPath();
      if (fs.existsSync(logoPath)) {
        const logoSize = 72;
        doc.image(logoPath, PAYMENT_DOC_PAGE_MARGIN + (contentWidth - logoSize) / 2, y, {
          width: logoSize,
          height: logoSize,
          fit: [logoSize, logoSize],
        });
        y += logoSize + 14;
      }

      y =
        drawCenteredText(doc, viewModel.title.toUpperCase(), y, {
          font: PAYMENT_DOC_FONT_BOLD,
          fontSize: 16,
          color: identity.primaryColor,
        }) + 22;

      doc
        .font(PAYMENT_DOC_FONT_REGULAR)
        .fontSize(11)
        .fillColor("#1f2233")
        .text(
          `L'Association SQY PING atteste que ${viewModel.civilityLabel} ${viewModel.adherentName}`,
          PAYMENT_DOC_PAGE_MARGIN,
          y,
          { width: contentWidth, align: "left", lineGap: 3 }
        );
      y = doc.y + 12;

      doc.text(
        `S'est ${viewModel.enrolledParticiple} au club de SQY PING pour un montant correspondant aux frais d'inscription de :`,
        PAYMENT_DOC_PAGE_MARGIN,
        y,
        { width: contentWidth, lineGap: 3 }
      );
      y = doc.y + 8;

      doc
        .font(PAYMENT_DOC_FONT_BOLD)
        .fontSize(14)
        .fillColor(identity.primaryColor)
        .text(viewModel.inscriptionAmountLabel, PAYMENT_DOC_PAGE_MARGIN, y, {
          width: contentWidth,
          align: "center",
        });
      y = doc.y + 14;

      doc
        .font(PAYMENT_DOC_FONT_REGULAR)
        .fontSize(11)
        .fillColor("#1f2233")
        .text(
          `Activité pratiquée pour la saison ${viewModel.seasonLabel} : ${viewModel.activityLabel}`,
          PAYMENT_DOC_PAGE_MARGIN,
          y,
          { width: contentWidth, lineGap: 3 }
        );
      y = doc.y + 10;

      doc.text(
        `Facture acquittée le ${viewModel.settledAtLabel} par : ${viewModel.primaryPaymentMethodLabel}`,
        PAYMENT_DOC_PAGE_MARGIN,
        y,
        { width: contentWidth, lineGap: 3 }
      );
      y = doc.y + 22;

      doc
        .font(PAYMENT_DOC_FONT_REGULAR)
        .fontSize(11)
        .fillColor("#1f2233")
        .text(`Pour l'association, le ${viewModel.issuedAtLabel}`, PAYMENT_DOC_PAGE_MARGIN, y, {
          width: contentWidth,
        });
      y = doc.y + 6;

      doc
        .font(PAYMENT_DOC_FONT_BOLD)
        .fontSize(11)
        .fillColor("#1f2233")
        .text(viewModel.signatoryName, PAYMENT_DOC_PAGE_MARGIN, y, {
          width: contentWidth,
        });
      y = doc.y + 10;

      const signatureWidth = 160;
      const signatureHeight = 72;
      const maxSignatureY = contentBottom - signatureHeight;
      if (y > maxSignatureY) {
        y = Math.max(PAYMENT_DOC_PAGE_MARGIN, maxSignatureY);
      }
      doc.image(signaturePath, PAYMENT_DOC_PAGE_MARGIN, y, {
        width: signatureWidth,
        height: signatureHeight,
        fit: [signatureWidth, signatureHeight],
      });

      drawCertificateFooter(doc, contentWidth);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
