import fs from "node:fs";
import path from "node:path";
import { formatCentsAsEuros } from "@/lib/pricing/format";
import { CLUB_PAYMENT_DOCUMENT_IDENTITY } from "./club-document-identity";

export const PAYMENT_DOC_PAGE_MARGIN = 48;
export const PAYMENT_DOC_FONT_REGULAR = "NotoSans";
export const PAYMENT_DOC_FONT_BOLD = "NotoSans-Bold";
export const PAYMENT_DOC_CONTENT_WIDTH = 595.28 - PAYMENT_DOC_PAGE_MARGIN * 2;

export function resolvePaymentDocFontPath(fileName: string): string {
  return path.join(process.cwd(), "public", "fonts", "payment-receipt", fileName);
}

export function resolvePaymentDocLogoPath(): string {
  return path.join(process.cwd(), ...CLUB_PAYMENT_DOCUMENT_IDENTITY.logoPathRelative);
}

export function assertPaymentDocFontsExist(): void {
  const regular = resolvePaymentDocFontPath("NotoSans-Regular.ttf");
  const bold = resolvePaymentDocFontPath("NotoSans-Bold.ttf");
  if (!fs.existsSync(regular) || !fs.existsSync(bold)) {
    throw new Error(
      "Polices des documents de paiement introuvables (public/fonts/payment-receipt)."
    );
  }
}

export function registerPaymentDocFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(
    PAYMENT_DOC_FONT_REGULAR,
    resolvePaymentDocFontPath("NotoSans-Regular.ttf")
  );
  doc.registerFont(PAYMENT_DOC_FONT_BOLD, resolvePaymentDocFontPath("NotoSans-Bold.ttf"));
}

export type PaymentDocTableRow = {
  label: string;
  amountCents: number;
  quantity?: number;
};

export type PaymentDocHeaderParams = {
  documentTitle: string;
  documentNumber: string;
  issuedAtLabel: string;
  /** Réservé aux factures à payer ; omis sur les justificatifs post-paiement. */
  dueAtLabel?: string | null;
  statusLabel?: string | null;
  statusColor?: string;
  /** Libellé du bloc destinataire (ex. « Adhérent »). */
  partyLabel?: string;
  billToName: string;
  billToExtraLines?: string[];
};

function drawHorizontalRule(doc: PDFKit.PDFDocument, y: number, color = "#D8DCE8"): void {
  doc
    .save()
    .strokeColor(color)
    .lineWidth(0.8)
    .moveTo(PAYMENT_DOC_PAGE_MARGIN, y)
    .lineTo(PAYMENT_DOC_PAGE_MARGIN + PAYMENT_DOC_CONTENT_WIDTH, y)
    .stroke()
    .restore();
}

/** Pastille de statut (Soldé / Partiellement payé). */
export function drawPaymentDocStatusBadge(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  label: string,
  color: string
): number {
  const fontSize = 9;
  const padX = 10;
  const padY = 5;
  doc.font(PAYMENT_DOC_FONT_BOLD).fontSize(fontSize);
  const width = doc.widthOfString(label) + padX * 2;
  const height = fontSize + padY * 2;
  const background =
    color.toUpperCase() === "#1B7F3A"
      ? "#E7F6EE"
      : color.toUpperCase() === "#B07000"
        ? "#FFF3E0"
        : "#EEF1F7";

  doc.save().roundedRect(x, y, width, height, 4).fillColor(background).fill().restore();
  doc
    .save()
    .lineWidth(0.9)
    .strokeColor(color)
    .roundedRect(x, y, width, height, 4)
    .stroke()
    .restore();
  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(fontSize)
    .fillColor(color)
    .text(label, x + padX, y + padY, { lineBreak: false });

  return y + height;
}


/** En-tête pro : logo, identité club, titre document, destinataire. */
export function drawPaymentDocHeader(
  doc: PDFKit.PDFDocument,
  params: PaymentDocHeaderParams
): number {
  const identity = CLUB_PAYMENT_DOCUMENT_IDENTITY;
  const leftX = PAYMENT_DOC_PAGE_MARGIN;
  const rightX = PAYMENT_DOC_PAGE_MARGIN + PAYMENT_DOC_CONTENT_WIDTH;
  const metaTop = PAYMENT_DOC_PAGE_MARGIN;
  let y = metaTop;

  const logoPath = resolvePaymentDocLogoPath();
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, leftX, y, { width: 48, height: 48, fit: [48, 48] });
  }

  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(14)
    .fillColor(identity.primaryColor)
    .text(identity.legalName, leftX + 60, y + 2, { width: 250 });
  doc
    .font(PAYMENT_DOC_FONT_REGULAR)
    .fontSize(8)
    .fillColor("#525871")
    .text(identity.addressLines.join("\n"), leftX + 60, y + 20, {
      width: 250,
      lineGap: 2,
    });
  doc.text(`${identity.phone}  ·  ${identity.email}`, leftX + 60, doc.y + 3, {
    width: 250,
  });
  const leftBottom = doc.y;

  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(18)
    .fillColor(identity.primaryColor)
    .text(params.documentTitle, leftX + 300, metaTop, {
      width: rightX - (leftX + 300),
      align: "right",
    });
  doc
    .font(PAYMENT_DOC_FONT_REGULAR)
    .fontSize(9)
    .fillColor("#333333")
    .text(`N° ${params.documentNumber}`, leftX + 300, metaTop + 26, {
      width: rightX - (leftX + 300),
      align: "right",
    })
    .text(`Date d'émission : ${params.issuedAtLabel}`, {
      width: rightX - (leftX + 300),
      align: "right",
    });
  if (params.dueAtLabel) {
    doc.text(`Date d'échéance : ${params.dueAtLabel}`, {
      width: rightX - (leftX + 300),
      align: "right",
    });
  }
  const rightBottom = doc.y;

  // Respiration sous le bloc contact / méta avant le trait (évite le collé email ↔ règle).
  y = Math.max(leftBottom, rightBottom) + 18;
  drawHorizontalRule(doc, y, identity.primaryColor);
  y += 16;

  if (params.statusLabel) {
    y =
      drawPaymentDocStatusBadge(
        doc,
        leftX,
        y,
        params.statusLabel,
        params.statusColor ?? identity.secondaryColor
      ) + 12;
  }

  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(9)
    .fillColor("#525871")
    .text(params.partyLabel ?? "Adhérent", leftX, y);
  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(11)
    .fillColor("#1f2233")
    .text(params.billToName, leftX, y + 12);
  let billY = doc.y + 3;
  for (const line of params.billToExtraLines ?? []) {
    doc
      .font(PAYMENT_DOC_FONT_REGULAR)
      .fontSize(9)
      .fillColor("#525871")
      .text(line, leftX, billY);
    billY = doc.y + 2;
  }

  return billY + 16;
}

/** Tableau lignes : description + quantité + montant. */
export function drawPaymentDocLinesTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  rows: PaymentDocTableRow[],
  totalLabel: string,
  totalCents: number
): number {
  const identity = CLUB_PAYMENT_DOCUMENT_IDENTITY;
  const colDesc = PAYMENT_DOC_PAGE_MARGIN;
  const colQty = PAYMENT_DOC_PAGE_MARGIN + 320;
  const colAmount = PAYMENT_DOC_PAGE_MARGIN + 380;
  const rowHeight = 22;
  let y = startY;

  doc
    .save()
    .rect(PAYMENT_DOC_PAGE_MARGIN, y, PAYMENT_DOC_CONTENT_WIDTH, 22)
    .fill(identity.primaryColor)
    .restore();
  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(9)
    .fillColor("#ffffff")
    .text("Description", colDesc + 8, y + 6, { width: 300 })
    .text("Qté", colQty, y + 6, { width: 40, align: "right" })
    .text("Montant", colAmount, y + 6, { width: 110, align: "right" });
  y += 22;

  rows.forEach((row, index) => {
    if (index % 2 === 1) {
      doc
        .save()
        .rect(PAYMENT_DOC_PAGE_MARGIN, y, PAYMENT_DOC_CONTENT_WIDTH, rowHeight)
        .fill("#F6F7FB")
        .restore();
    }
    const qty = row.quantity ?? 1;
    doc
      .font(PAYMENT_DOC_FONT_REGULAR)
      .fontSize(9)
      .fillColor("#1f2233")
      .text(row.label, colDesc + 8, y + 6, { width: 300 })
      .text(String(qty), colQty, y + 6, { width: 40, align: "right" })
      .text(formatCentsAsEuros(row.amountCents), colAmount, y + 6, {
        width: 110,
        align: "right",
      });
    y += rowHeight;
  });

  drawHorizontalRule(doc, y, "#D8DCE8");
  y += 10;

  doc
    .font(PAYMENT_DOC_FONT_BOLD)
    .fontSize(11)
    .fillColor(identity.primaryColor)
    .text(totalLabel, colDesc + 8, y, { width: 300 })
    .text(formatCentsAsEuros(totalCents), colAmount, y, {
      width: 110,
      align: "right",
    });

  return y + 28;
}

export function drawPaymentDocKeyValueBlock(
  doc: PDFKit.PDFDocument,
  startY: number,
  rows: Array<{ label: string; value: string; emphasize?: boolean; color?: string }>
): number {
  let y = startY;
  for (const row of rows) {
    doc
      .font(PAYMENT_DOC_FONT_REGULAR)
      .fontSize(9)
      .fillColor("#525871")
      .text(row.label, PAYMENT_DOC_PAGE_MARGIN, y, { width: 160 });
    doc
      .font(row.emphasize ? PAYMENT_DOC_FONT_BOLD : PAYMENT_DOC_FONT_REGULAR)
      .fontSize(row.emphasize ? 11 : 9)
      .fillColor(row.color ?? "#1f2233")
      .text(row.value, PAYMENT_DOC_PAGE_MARGIN + 170, y, { width: 320, align: "right" });
    y += row.emphasize ? 18 : 14;
  }
  return y + 8;
}

export function drawPaymentDocFooter(doc: PDFKit.PDFDocument, note: string): void {
  const identity = CLUB_PAYMENT_DOCUMENT_IDENTITY;
  const previousBottomMargin = doc.page.margins.bottom;
  // Le pied de page est dessiné dans la zone de marge : on désactive la marge basse
  // le temps du rendu pour éviter un saut de page automatique.
  doc.page.margins.bottom = 0;

  const footerTop = doc.page.height - 52;
  drawHorizontalRule(doc, footerTop, "#D8DCE8");
  doc
    .font(PAYMENT_DOC_FONT_REGULAR)
    .fontSize(7)
    .fillColor("#525871")
    .text(identity.legalLines.join("  "), PAYMENT_DOC_PAGE_MARGIN, footerTop + 6, {
      width: PAYMENT_DOC_CONTENT_WIDTH,
      height: 10,
      lineBreak: false,
    })
    .text(
      `Site : ${identity.website}  ·  ${note}`,
      PAYMENT_DOC_PAGE_MARGIN,
      footerTop + 18,
      {
        width: PAYMENT_DOC_CONTENT_WIDTH,
        height: 10,
        lineBreak: false,
      }
    );

  doc.page.margins.bottom = previousBottomMargin;
}
