import path from "node:path";
import fs from "node:fs";
import { formatCentsAsEuros } from "@/lib/pricing/format";

export const PAYMENT_DOC_PAGE_MARGIN = 50;
export const PAYMENT_DOC_FONT_REGULAR = "NotoSans";
export const PAYMENT_DOC_FONT_BOLD = "NotoSans-Bold";

export function resolvePaymentDocFontPath(fileName: string): string {
  return path.join(process.cwd(), "public", "fonts", "payment-receipt", fileName);
}

export function assertPaymentDocFontsExist(): void {
  const regular = resolvePaymentDocFontPath("NotoSans-Regular.ttf");
  const bold = resolvePaymentDocFontPath("NotoSans-Bold.ttf");
  if (!fs.existsSync(regular) || !fs.existsSync(bold)) {
    throw new Error("Polices des documents de paiement introuvables (public/fonts/payment-receipt).");
  }
}

export function registerPaymentDocFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(
    PAYMENT_DOC_FONT_REGULAR,
    resolvePaymentDocFontPath("NotoSans-Regular.ttf")
  );
  doc.registerFont(PAYMENT_DOC_FONT_BOLD, resolvePaymentDocFontPath("NotoSans-Bold.ttf"));
}

export function drawPaymentDocSectionTitle(
  doc: PDFKit.PDFDocument,
  title: string,
  y: number
): number {
  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(12)
    .fillColor("#0B3A6E")
    .text(title, PAYMENT_DOC_PAGE_MARGIN, y);
  return doc.y + 8;
}

export function drawPaymentDocKeyValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  y: number
): number {
  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(10)
    .fillColor("#333333")
    .text(label, PAYMENT_DOC_PAGE_MARGIN, y, { continued: true });
  doc.font(PAYMENT_DOC_FONT_REGULAR).text(` ${value}`);
  return doc.y + 4;
}

export function drawPaymentDocAmountRow(
  doc: PDFKit.PDFDocument,
  label: string,
  amountCents: number,
  options?: { bold?: boolean; color?: string }
): void {
  const y = doc.y;
  const amount = formatCentsAsEuros(amountCents);
  const font = options?.bold ? PAYMENT_DOC_FONT_BOLD : PAYMENT_DOC_FONT_REGULAR;
  const color = options?.color ?? "#222222";
  doc.font(font).fontSize(10).fillColor(color).text(label, PAYMENT_DOC_PAGE_MARGIN, y, {
    width: 360,
  });
  doc
    .font(font)
    .fontSize(10)
    .fillColor(color)
    .text(amount, PAYMENT_DOC_PAGE_MARGIN + 360, y, {
      width: 120,
      align: "right",
    });
  doc.moveDown(0.4);
}
