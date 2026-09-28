import {
  assertPaymentDocFontsExist,
  drawPaymentDocAmountRow,
  drawPaymentDocKeyValue,
  drawPaymentDocSectionTitle,
  PAYMENT_DOC_FONT_BOLD,
  PAYMENT_DOC_FONT_REGULAR,
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
        Subject: `Facture adhésion ${viewModel.registrationId}`,
      },
    });
    registerPaymentDocFonts(doc);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc
        .font(PAYMENT_DOC_FONT_BOLD)
        .fontSize(18)
        .fillColor("#0B3A6E")
        .text(viewModel.clubName);
      doc.moveDown(0.3);
      doc
        .font(PAYMENT_DOC_FONT_BOLD)
        .fontSize(14)
        .fillColor("#111111")
        .text(viewModel.title);
      doc.moveDown(0.8);

      let y = doc.y;
      y = drawPaymentDocKeyValue(doc, "Adhérent :", viewModel.adherentName, y);
      if (viewModel.seasonLabel) {
        y = drawPaymentDocKeyValue(doc, "Saison :", viewModel.seasonLabel, y);
      }
      y = drawPaymentDocKeyValue(doc, "Référence dossier :", viewModel.registrationId, y);
      y = drawPaymentDocKeyValue(doc, "Émise le :", viewModel.issuedAtLabel, y);
      doc.y = y + 10;

      doc.y = drawPaymentDocSectionTitle(doc, "Détail", doc.y);
      for (const line of viewModel.quoteLines) {
        drawPaymentDocAmountRow(doc, line.label, line.amountCents);
      }
      drawPaymentDocAmountRow(doc, "Total", viewModel.invoicedTotalCents, {
        bold: true,
      });

      doc.moveDown(1.2);
      doc
        .font(PAYMENT_DOC_FONT_REGULAR)
        .fontSize(9)
        .fillColor("#666666")
        .text(
          "Document généré par TeamUp — facture / détail tarifaire de l'adhésion. " +
            "Le reçu de paiement est un document distinct (preuve d'encaissement).",
          { width: 495 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
