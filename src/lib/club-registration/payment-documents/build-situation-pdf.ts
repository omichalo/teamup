import { formatCentsAsEuros } from "@/lib/pricing/format";
import { CLUB_PAYMENT_DOCUMENT_IDENTITY } from "./club-document-identity";
import {
  assertPaymentDocFontsExist,
  drawPaymentDocFooter,
  drawPaymentDocHeader,
  drawPaymentDocKeyValueBlock,
  drawPaymentDocLinesTable,
  PAYMENT_DOC_FONT_BOLD,
  PAYMENT_DOC_FONT_REGULAR,
  PAYMENT_DOC_PAGE_MARGIN,
  registerPaymentDocFonts,
} from "./pdf-kit-shared";
import { sanitizeReceiptPaymentDetail } from "./build-receipt-pdf";
import type { PaymentSituationViewModel } from "./types";

/** PDF état de situation — informatif, sans n° de pièce comptable. */
export async function buildPaymentSituationPdf(
  viewModel: PaymentSituationViewModel
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
        Subject: "État de situation adhésion",
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
        ...(viewModel.invoiceNumber ? [`Facture ${viewModel.invoiceNumber}`] : []),
      ];
      let y = drawPaymentDocHeader(doc, {
        documentTitle: "Situation",
        documentNumberLabel: "Document informatif",
        issuedAtLabel: viewModel.issuedAtLabel,
        statusLabel: viewModel.settlementLabel,
        statusColor:
          viewModel.settlementLabel === "Soldé"
            ? "#1B7F3A"
            : viewModel.settlementLabel === "Partiellement payé"
              ? "#B07000"
              : "#525871",
        partyLabel: "Adhérent",
        billToName: viewModel.adherentName,
        billToExtraLines: billToExtra,
      });

      if (viewModel.quoteLines.length > 0) {
        y = drawPaymentDocLinesTable(
          doc,
          y,
          viewModel.quoteLines.map((line) => ({
            label: line.label,
            amountCents: line.amountCents,
          })),
          "Total facturé",
          viewModel.invoicedTotalCents
        );
      }

      doc
        .font(PAYMENT_DOC_FONT_BOLD)
        .fontSize(11)
        .fillColor(CLUB_PAYMENT_DOCUMENT_IDENTITY.primaryColor)
        .text("Encaissements", PAYMENT_DOC_PAGE_MARGIN, y);
      y = doc.y + 8;

      if (viewModel.payments.length === 0) {
        doc
          .font(PAYMENT_DOC_FONT_REGULAR)
          .fontSize(9)
          .fillColor("#525871")
          .text("Aucun encaissement enregistré.", PAYMENT_DOC_PAGE_MARGIN, y);
        y = doc.y + 10;
      } else {
        for (const payment of viewModel.payments) {
          const recPrefix = payment.documentNumber
            ? `${payment.documentNumber} — `
            : "";
          const detail = `${recPrefix}${sanitizeReceiptPaymentDetail(payment)}`;
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
              formatCentsAsEuros(payment.amountCents),
              PAYMENT_DOC_PAGE_MARGIN + 380,
              y,
              { width: 110, align: "right" }
            );
          y = Math.max(doc.y, y) + 10;
        }
      }

      y += 4;
      y = drawPaymentDocKeyValueBlock(doc, y, [
        {
          label: "Total encaissé",
          value: formatCentsAsEuros(viewModel.paidTotalCents),
          emphasize: true,
          color: "#1B7F3A",
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
        "Document informatif — ne constitue pas une pièce comptable. " +
          "Les encaissements sont justifiés par les reçus REC-… ; la facture par le n° FAC-…."
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
