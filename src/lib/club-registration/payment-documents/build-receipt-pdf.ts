import { formatCentsAsEuros } from "@/lib/pricing/format";
import { CLUB_PAYMENT_DOCUMENT_IDENTITY } from "./club-document-identity";
import {
  assertPaymentDocFontsExist,
  drawPaymentDocFooter,
  drawPaymentDocHeader,
  drawPaymentDocKeyValueBlock,
  PAYMENT_DOC_FONT_BOLD,
  PAYMENT_DOC_FONT_REGULAR,
  PAYMENT_DOC_PAGE_MARGIN,
  registerPaymentDocFonts,
} from "./pdf-kit-shared";
import type { PaymentReceiptPaymentLine, PaymentReceiptViewModel } from "./types";

/** Retire les identifiants techniques Stripe / Checkout peu lisibles. */
export function sanitizeReceiptPaymentDetail(
  payment: PaymentReceiptPaymentLine
): string {
  const rawParts = [
    payment.receivedAtLabel,
    payment.methodLabel,
    payment.label,
    payment.reference ? `Réf. ${payment.reference}` : null,
    payment.note ?? null,
  ].filter((part): part is string => Boolean(part));

  return rawParts
    .map((part) =>
      part
        .replace(/\bCheckout\s+cs_[a-zA-Z0-9_]+/gi, "Paiement en ligne")
        .replace(/\bcs_(test|live)_[a-zA-Z0-9]+/gi, "")
        .replace(/\bpi_[a-zA-Z0-9]+/gi, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s—\s*$/g, "")
        .trim()
    )
    .filter((part) => part.length > 0)
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(" — ");
}

/** PDF reçu unitaire (une pièce REC = un encaissement). */
export async function buildPaymentReceiptPdf(
  viewModel: PaymentReceiptViewModel
): Promise<Buffer> {
  assertPaymentDocFontsExist();
  const { default: PDFDocument } = await import("pdfkit");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAYMENT_DOC_PAGE_MARGIN,
      info: {
        Title: viewModel.title,
        Author: viewModel.clubName,
        Subject: `Reçu ${viewModel.documentNumber}`,
      },
    });
    registerPaymentDocFonts(doc);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const billToExtra = [
        ...(viewModel.seasonLabel ? [`Saison ${viewModel.seasonLabel}`] : []),
        `Réf. dossier ${viewModel.registrationId}`,
      ];
      let y = drawPaymentDocHeader(doc, {
        documentTitle: "Reçu",
        documentNumber: viewModel.documentNumber,
        issuedAtLabel: viewModel.issuedAtLabel,
        partyLabel: "Adhérent",
        billToName: viewModel.adherentName,
        billToExtraLines: billToExtra,
      });

      doc
        .font(PAYMENT_DOC_FONT_BOLD)
        .fontSize(11)
        .fillColor(CLUB_PAYMENT_DOCUMENT_IDENTITY.primaryColor)
        .text("Encaissement", PAYMENT_DOC_PAGE_MARGIN, y);
      y = doc.y + 8;

      const detail = sanitizeReceiptPaymentDetail(viewModel.payment);
      doc
        .font(PAYMENT_DOC_FONT_REGULAR)
        .fontSize(9)
        .fillColor("#1f2233")
        .text(detail, PAYMENT_DOC_PAGE_MARGIN, y, { width: 360 });
      doc
        .font(PAYMENT_DOC_FONT_BOLD)
        .fontSize(9)
        .fillColor("#1f2233")
        .text(
          formatCentsAsEuros(viewModel.payment.amountCents),
          PAYMENT_DOC_PAGE_MARGIN + 380,
          y,
          { width: 110, align: "right" }
        );
      y = Math.max(doc.y, y) + 14;

      y = drawPaymentDocKeyValueBlock(doc, y, [
        {
          label: "Montant reçu",
          value: formatCentsAsEuros(viewModel.payment.amountCents),
          emphasize: true,
          color: "#1B7F3A",
        },
        {
          label: "Total facturé (adhésion)",
          value: formatCentsAsEuros(viewModel.invoicedTotalCents),
        },
        {
          label: "Total encaissé à ce jour",
          value: formatCentsAsEuros(viewModel.paidTotalCents),
        },
        ...(viewModel.remainingCents > 0
          ? [
              {
                label: "Reste dû",
                value: formatCentsAsEuros(viewModel.remainingCents),
                emphasize: true,
                color: "#B07000",
              },
            ]
          : []),
      ]);

      doc.y = y;
      drawPaymentDocFooter(
        doc,
        "Pièce comptable d'encaissement. Pour le solde global, téléchargez l'état de situation. " +
          "La facture (détail tarifaire) est un document distinct."
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
