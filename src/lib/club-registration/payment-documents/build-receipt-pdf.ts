import fs from "node:fs";
import path from "node:path";
import { formatCentsAsEuros } from "@/lib/pricing/format";
import type { PaymentReceiptViewModel } from "./types";

const PAGE_MARGIN = 50;
const FONT_REGULAR = "NotoSans";
const FONT_BOLD = "NotoSans-Bold";

function resolveFontPath(fileName: string): string {
  return path.join(process.cwd(), "public", "fonts", "payment-receipt", fileName);
}

function registerFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(FONT_REGULAR, resolveFontPath("NotoSans-Regular.ttf"));
  doc.registerFont(FONT_BOLD, resolveFontPath("NotoSans-Bold.ttf"));
}

function assertFontsExist(): void {
  const regular = resolveFontPath("NotoSans-Regular.ttf");
  const bold = resolveFontPath("NotoSans-Bold.ttf");
  if (!fs.existsSync(regular) || !fs.existsSync(bold)) {
    throw new Error("Polices du reçu introuvables (public/fonts/payment-receipt).");
  }
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.font(FONT_BOLD).fontSize(12).fillColor("#0B3A6E").text(title, PAGE_MARGIN, y);
  return doc.y + 8;
}

function drawKeyValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  y: number
): number {
  doc.font(FONT_BOLD).fontSize(10).fillColor("#333333").text(label, PAGE_MARGIN, y, {
    continued: true,
  });
  doc.font(FONT_REGULAR).text(` ${value}`);
  return doc.y + 4;
}

function drawAmountRow(
  doc: PDFKit.PDFDocument,
  label: string,
  amountCents: number,
  options?: { bold?: boolean; color?: string }
): void {
  const y = doc.y;
  const amount = formatCentsAsEuros(amountCents);
  const font = options?.bold ? FONT_BOLD : FONT_REGULAR;
  const color = options?.color ?? "#222222";
  doc.font(font).fontSize(10).fillColor(color).text(label, PAGE_MARGIN, y, {
    width: 360,
  });
  doc.font(font).fontSize(10).fillColor(color).text(amount, PAGE_MARGIN + 360, y, {
    width: 120,
    align: "right",
  });
  doc.moveDown(0.4);
}

/**
 * Génère le PDF binaire du reçu / attestation d'encaissement TeamUp.
 */
export async function buildPaymentReceiptPdf(
  viewModel: PaymentReceiptViewModel
): Promise<Buffer> {
  assertFontsExist();
  const { default: PDFDocument } = await import("pdfkit");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      info: {
        Title: viewModel.title,
        Author: viewModel.clubName,
        Subject: `Reçu adhésion ${viewModel.registrationId}`,
      },
    });
    registerFonts(doc);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc.font(FONT_BOLD).fontSize(18).fillColor("#0B3A6E").text(viewModel.clubName);
      doc.moveDown(0.3);
      doc.font(FONT_BOLD).fontSize(14).fillColor("#111111").text(viewModel.title);
      doc.moveDown(0.2);
      doc
        .font(FONT_BOLD)
        .fontSize(11)
        .fillColor(viewModel.isFullySettled ? "#1B7F3A" : "#B07000")
        .text(viewModel.settlementLabel);
      doc.moveDown(0.8);

      let y = doc.y;
      y = drawKeyValue(doc, "Adhérent :", viewModel.adherentName, y);
      if (viewModel.seasonLabel) {
        y = drawKeyValue(doc, "Saison :", viewModel.seasonLabel, y);
      }
      y = drawKeyValue(doc, "Référence dossier :", viewModel.registrationId, y);
      y = drawKeyValue(doc, "Émis le :", viewModel.issuedAtLabel, y);
      doc.y = y + 10;

      if (viewModel.quoteLines.length > 0) {
        doc.y = drawSectionTitle(doc, "Détail facturé", doc.y);
        for (const line of viewModel.quoteLines) {
          drawAmountRow(doc, line.label, line.amountCents);
        }
        drawAmountRow(doc, "Total facturé", viewModel.invoicedTotalCents, {
          bold: true,
        });
        doc.moveDown(0.6);
      } else {
        doc.y = drawSectionTitle(doc, "Montant facturé", doc.y);
        drawAmountRow(doc, "Total", viewModel.invoicedTotalCents, { bold: true });
        doc.moveDown(0.6);
      }

      doc.y = drawSectionTitle(doc, "Encaissements", doc.y);
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
        drawAmountRow(doc, details, payment.amountCents);
      }

      doc.moveDown(0.4);
      drawAmountRow(doc, "Total encaissé", viewModel.paidTotalCents, {
        bold: true,
        color: "#1B7F3A",
      });
      if (viewModel.remainingCents > 0) {
        drawAmountRow(doc, "Reste dû", viewModel.remainingCents, {
          bold: true,
          color: "#B07000",
        });
      }

      doc.moveDown(1.2);
      doc
        .font(FONT_REGULAR)
        .fontSize(9)
        .fillColor("#666666")
        .text(
          "Document généré par TeamUp — justificatif d'encaissement pour l'adhérent et le club. " +
            "En cas de paiement par carte, un reçu Stripe peut compléter ce document.",
          { width: 495 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
