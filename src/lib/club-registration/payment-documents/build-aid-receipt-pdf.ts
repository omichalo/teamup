import {
  assertPaymentDocFontsExist,
  drawPaymentDocFooter,
  drawPaymentDocHeader,
  drawPaymentDocLinesTable,
  PAYMENT_DOC_PAGE_MARGIN,
  registerPaymentDocFonts,
} from "./pdf-kit-shared";
import type { PaymentAidReceiptViewModel } from "./types";

/** Génère le PDF justificatif d'aide reçue (pièce AID). */
export async function buildPaymentAidReceiptPdf(
  viewModel: PaymentAidReceiptViewModel
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
        Subject: `Aide ${viewModel.documentNumber}`,
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

      const detailParts = [
        viewModel.aidLabel,
        ...(viewModel.reference ? [`Réf. ${viewModel.reference}`] : []),
        ...(viewModel.note ? [viewModel.note] : []),
      ];

      y = drawPaymentDocLinesTable(
        doc,
        y,
        [
          {
            label: detailParts.join(" — "),
            amountCents: viewModel.amountCents,
          },
        ],
        "Montant reçu",
        viewModel.amountCents
      );

      doc.y = y;
      drawPaymentDocFooter(
        doc,
        "Document généré par TeamUp — justificatif de réception d'une aide " +
          "(Pass Sport, Labaz, etc.). Pièce comptable distincte de la facture adhérent."
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
