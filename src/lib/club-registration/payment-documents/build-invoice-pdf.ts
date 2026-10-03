import {
  assertPaymentDocFontsExist,
  drawPaymentDocFooter,
  drawPaymentDocHeader,
  drawPaymentDocLinesTable,
  PAYMENT_DOC_FONT_REGULAR,
  PAYMENT_DOC_PAGE_MARGIN,
  registerPaymentDocFonts,
} from "./pdf-kit-shared";
import type { PaymentInvoiceViewModel } from "./types";

/** Génère le PDF facture / facture complémentaire / avoir TeamUp. */
export async function buildPaymentInvoicePdf(
  viewModel: PaymentInvoiceViewModel
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
        Subject: `${viewModel.title} ${viewModel.documentNumber}`,
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
        documentTitle: viewModel.title,
        documentNumber: viewModel.documentNumber,
        issuedAtLabel: viewModel.issuedAtLabel,
        partyLabel: "Adhérent",
        billToName: viewModel.adherentName,
        billToExtraLines: billToExtra,
      });

      y = drawPaymentDocLinesTable(
        doc,
        y,
        viewModel.quoteLines.map((line) => ({
          label: line.label,
          amountCents: line.amountCents,
        })),
        viewModel.isCreditNote ? "Total avoir" : "Total",
        viewModel.invoicedTotalCents
      );

      if (viewModel.reason) {
        doc
          .font(PAYMENT_DOC_FONT_REGULAR)
          .fontSize(9)
          .fillColor("#4A5568")
          .text(`Motif : ${viewModel.reason}`, PAYMENT_DOC_PAGE_MARGIN, y + 8, {
            width: 595.28 - PAYMENT_DOC_PAGE_MARGIN * 2,
          });
        y = doc.y + 8;
      }

      doc.y = y;
      drawPaymentDocFooter(
        doc,
        viewModel.isCreditNote
          ? "Document généré par TeamUp — avoir comptable figé. Ne pas recalculer."
          : "Document généré par TeamUp — pièce tarifaire figée. " +
              "Le reçu de paiement est un justificatif distinct."
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
