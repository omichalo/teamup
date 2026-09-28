import {
  assertPaymentDocFontsExist,
  drawPaymentDocFooter,
  drawPaymentDocHeader,
  drawPaymentDocLinesTable,
  PAYMENT_DOC_PAGE_MARGIN,
  registerPaymentDocFonts,
} from "./pdf-kit-shared";
import type { PaymentInvoiceViewModel } from "./types";

/** Génère le PDF facture TeamUp (détail tarifaire). */
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
        Subject: `Facture ${viewModel.documentNumber}`,
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
        documentTitle: "Facture",
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
        "Total",
        viewModel.invoicedTotalCents
      );

      doc.y = y;
      drawPaymentDocFooter(
        doc,
        "Document généré par TeamUp — détail tarifaire de l'adhésion. " +
          "Le reçu de paiement est un justificatif distinct."
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
