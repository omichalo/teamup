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
import type { PaymentReceiptViewModel } from "./types";

/**
 * Génère le PDF binaire du reçu / attestation d'encaissement TeamUp.
 */
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
        Subject: `Reçu adhésion ${viewModel.registrationId}`,
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
      doc.moveDown(0.2);
      doc
        .font(PAYMENT_DOC_FONT_BOLD)
        .fontSize(11)
        .fillColor(viewModel.isFullySettled ? "#1B7F3A" : "#B07000")
        .text(viewModel.settlementLabel);
      doc.moveDown(0.8);

      let y = doc.y;
      y = drawPaymentDocKeyValue(doc, "Adhérent :", viewModel.adherentName, y);
      if (viewModel.seasonLabel) {
        y = drawPaymentDocKeyValue(doc, "Saison :", viewModel.seasonLabel, y);
      }
      y = drawPaymentDocKeyValue(doc, "Référence dossier :", viewModel.registrationId, y);
      y = drawPaymentDocKeyValue(doc, "Émis le :", viewModel.issuedAtLabel, y);
      doc.y = y + 10;

      if (viewModel.quoteLines.length > 0) {
        doc.y = drawPaymentDocSectionTitle(doc, "Détail facturé", doc.y);
        for (const line of viewModel.quoteLines) {
          drawPaymentDocAmountRow(doc, line.label, line.amountCents);
        }
        drawPaymentDocAmountRow(doc, "Total facturé", viewModel.invoicedTotalCents, {
          bold: true,
        });
        doc.moveDown(0.6);
      } else {
        doc.y = drawPaymentDocSectionTitle(doc, "Montant facturé", doc.y);
        drawPaymentDocAmountRow(doc, "Total", viewModel.invoicedTotalCents, {
          bold: true,
        });
        doc.moveDown(0.6);
      }

      doc.y = drawPaymentDocSectionTitle(doc, "Encaissements", doc.y);
      for (const payment of viewModel.payments) {
        const details = [
          payment.receivedAtLabel,
          payment.methodLabel,
          payment.label,
          payment.reference ? `Réf. ${payment.reference}` : null,
          payment.note ?? null,
        ]
          .filter((part): part is string => Boolean(part))
          .join(" — ");
        drawPaymentDocAmountRow(doc, details, payment.amountCents);
      }

      doc.moveDown(0.4);
      drawPaymentDocAmountRow(doc, "Total encaissé", viewModel.paidTotalCents, {
        bold: true,
        color: "#1B7F3A",
      });
      if (viewModel.remainingCents > 0) {
        drawPaymentDocAmountRow(doc, "Reste dû", viewModel.remainingCents, {
          bold: true,
          color: "#B07000",
        });
      }

      doc.moveDown(1.2);
      doc
        .font(PAYMENT_DOC_FONT_REGULAR)
        .fontSize(9)
        .fillColor("#666666")
        .text(
          "Document généré par TeamUp — justificatif d'encaissement pour l'adhérent et le club. " +
            "La facture (détail tarifaire) est un document distinct.",
          { width: 495 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
