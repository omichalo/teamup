#!/usr/bin/env tsx
/**
 * Génère la spec PDF (docs/technical + public/docs pour l'IHM).
 *   npx tsx scripts/build-sage-export-spec-pdf.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import PDFDocument from "pdfkit";
import {
  SPEC_COVER_NOTE,
  SPEC_COVER_SUBTITLE,
  SPEC_DATE_LABEL,
  specSections,
  type SpecBlock,
} from "./sage-export-spec-content";

const COLORS = {
  primary: "#28306d",
  accent: "#f1861f",
  text: "#1f2233",
  muted: "#525871",
  line: "#d5d8e6",
  band: "#f6f7fb",
};

const PAGE = { width: 595.28, height: 841.89, margin: 54 };

const FONT_REGULAR = path.join(
  __dirname,
  "..",
  "public/fonts/payment-receipt/NotoSans-Regular.ttf"
);
const FONT_BOLD = path.join(
  __dirname,
  "..",
  "public/fonts/payment-receipt/NotoSans-Bold.ttf"
);

function contentWidth(): number {
  return PAGE.width - PAGE.margin * 2;
}

class SpecPdf {
  private readonly doc: PDFKit.PDFDocument;
  private readonly width = contentWidth();

  constructor(doc: PDFKit.PDFDocument) {
    this.doc = doc;
  }

  private ensure(height: number): void {
    if (this.doc.y + height > PAGE.height - PAGE.margin) {
      this.doc.addPage();
      this.doc.y = PAGE.margin;
    }
  }

  cover(): void {
    this.doc.rect(0, 0, PAGE.width, 220).fill(COLORS.primary);
    this.doc.rect(0, 220, PAGE.width, 8).fill(COLORS.accent);
    this.doc.fillColor("#ffffff").font("Bold").fontSize(13).text(
      "SQY PING  ·  TEAMUP",
      PAGE.margin,
      72
    );
    this.doc.font("Bold").fontSize(26).text("Export comptable\nvers Sage", PAGE.margin, 108, {
      width: this.width,
    });
    this.doc.font("Regular").fontSize(12).text(SPEC_COVER_SUBTITLE, PAGE.margin, 176, {
      width: this.width,
    });
    this.doc.fillColor(COLORS.text).font("Regular").fontSize(11);
    this.doc.text("Club SQY Ping — secrétariat / comptabilité", PAGE.margin, 260);
    this.doc.fillColor(COLORS.muted).text(SPEC_DATE_LABEL, PAGE.margin, 278);
    this.doc.moveDown(2);
    this.doc.fillColor(COLORS.text).font("Bold").fontSize(12).text("Avant le premier import");
    this.doc.moveDown(0.4);
    this.doc.font("Regular").fontSize(10).fillColor(COLORS.text).text(SPEC_COVER_NOTE, {
      width: this.width,
    });
    this.doc.addPage();
  }

  heading(text: string): void {
    this.ensure(36);
    this.doc.moveDown(0.6);
    this.doc.fillColor(COLORS.primary).font("Bold").fontSize(14).text(text, PAGE.margin, this.doc.y, {
      width: this.width,
    });
    const y = this.doc.y + 2;
    this.doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.margin + 72, y)
      .lineWidth(2)
      .strokeColor(COLORS.accent)
      .stroke();
    this.doc.moveDown(0.5);
    this.doc.fillColor(COLORS.text);
  }

  paragraph(text: string): void {
    this.ensure(40);
    this.doc.font("Regular").fontSize(10).fillColor(COLORS.text).text(text, PAGE.margin, this.doc.y, {
      width: this.width,
      align: "justify",
      lineGap: 2,
    });
    this.doc.moveDown(0.45);
  }

  bullets(items: string[]): void {
    for (const item of items) {
      this.ensure(28);
      const y = this.doc.y;
      this.doc.circle(PAGE.margin + 4, y + 6, 1.6).fill(COLORS.accent);
      this.doc.fillColor(COLORS.text).font("Regular").fontSize(10).text(item, PAGE.margin + 14, y, {
        width: this.width - 14,
        lineGap: 2,
      });
      this.doc.moveDown(0.3);
    }
    this.doc.moveDown(0.2);
  }

  note(text: string): void {
    this.doc.font("Regular").fontSize(9);
    const height = this.doc.heightOfString(text, { width: this.width - 16 }) + 14;
    this.ensure(height + 8);
    const y = this.doc.y;
    this.doc.rect(PAGE.margin, y, this.width, height).fill(COLORS.band);
    this.doc.fillColor(COLORS.primary).font("Regular").fontSize(9).text(text, PAGE.margin + 8, y + 7, {
      width: this.width - 16,
      lineGap: 1,
    });
    this.doc.y = y + height + 8;
    this.doc.fillColor(COLORS.text);
  }

  table(headers: string[], rows: string[][]): void {
    const cols = headers.length;
    const colWidth = this.width / cols;
    this.doc.font("Bold").fontSize(8);
    const headerHeight = Math.max(
      ...headers.map((header) => this.doc.heightOfString(header, { width: colWidth - 8 }) + 8),
      18
    );
    this.ensure(headerHeight + 20);
    this.drawRow(headers, headerHeight, true);
    this.doc.font("Regular").fontSize(8);
    for (const row of rows) {
      const rowHeight = Math.max(
        ...row.map((cell) => this.doc.heightOfString(cell, { width: colWidth - 8 }) + 8),
        16
      );
      this.ensure(rowHeight);
      this.drawRow(row, rowHeight, false);
    }
    this.doc.moveDown(0.5);
  }

  private drawRow(cells: string[], rowHeight: number, header: boolean): void {
    const y = this.doc.y;
    const colWidth = this.width / cells.length;
    if (header) {
      this.doc.rect(PAGE.margin, y, this.width, rowHeight).fill(COLORS.primary);
    }
    cells.forEach((cell, index) => {
      const x = PAGE.margin + index * colWidth;
      if (!header && index === 0) {
        this.doc
          .moveTo(PAGE.margin, y + rowHeight)
          .lineTo(PAGE.margin + this.width, y + rowHeight)
          .lineWidth(0.4)
          .strokeColor(COLORS.line)
          .stroke();
      }
      this.doc
        .fillColor(header ? "#ffffff" : COLORS.text)
        .font(header ? "Bold" : "Regular")
        .fontSize(8)
        .text(cell, x + 4, y + 4, { width: colWidth - 8 });
    });
    this.doc.y = y + rowHeight;
  }

  renderBlock(block: SpecBlock): void {
    if (block.type === "p") this.paragraph(block.text);
    else if (block.type === "ul") this.bullets(block.items);
    else if (block.type === "table") this.table(block.headers, block.rows);
    else if (block.type === "note") this.note(block.text);
    else this.heading(block.text);
  }

  footer(): void {
    const range = this.doc.bufferedPageRange();
    const pageCount = range.start + range.count;
    for (let pageIndex = range.start; pageIndex < pageCount; pageIndex += 1) {
      this.doc.switchToPage(pageIndex);
      const previousBottom = this.doc.page.margins.bottom;
      this.doc.page.margins.bottom = 0;
      this.doc.font("Regular").fontSize(8).fillColor(COLORS.muted);
      this.doc.text(
        `SQY Ping — Export comptable TeamUp vers Sage  ·  ${pageIndex + 1} / ${pageCount - range.start}`,
        PAGE.margin,
        PAGE.height - 30,
        { width: this.width, align: "left", lineBreak: false }
      );
      this.doc.page.margins.bottom = previousBottom;
    }
  }
}

async function writePdf(outPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE.margin,
    bufferPages: true,
    info: {
      Title: "Export comptable TeamUp vers Sage",
      Author: "SQY Ping",
      Subject: "Guide secrétariat — export TeamUp et import Sage",
    },
  });
  doc.registerFont("Regular", FONT_REGULAR);
  doc.registerFont("Bold", FONT_BOLD);
  const spec = new SpecPdf(doc);
  spec.cover();
  for (const section of specSections) {
    spec.heading(section.title);
    for (const block of section.blocks) {
      spec.renderBlock(block);
    }
  }
  spec.footer();
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(outPath);
    stream.on("finish", () => resolve());
    stream.on("error", reject);
    doc.pipe(stream);
    doc.end();
  });
}

async function main(): Promise<void> {
  const root = path.join(__dirname, "..");
  const technicalPath = path.join(root, "docs", "technical", "export-comptable-sage.pdf");
  const publicPath = path.join(root, "public", "docs", "export-comptable-sage.pdf");
  await writePdf(technicalPath);
  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.copyFileSync(technicalPath, publicPath);
  console.log(technicalPath);
  console.log(publicPath);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
