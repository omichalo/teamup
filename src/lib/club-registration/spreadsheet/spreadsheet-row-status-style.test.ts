import {
  resolveSpreadsheetRowStatusStyle,
  spreadsheetRowBackgroundColor,
} from "./spreadsheet-row-status-style";

describe("spreadsheet-row-status-style", () => {
  it("maps known registration statuses to tinted rows", () => {
    const style = resolveSpreadsheetRowStatusStyle("in_review");
    expect(style.borderLeftColor).toBe("info.main");
    expect(style.baseBg).toBe("info.50");
  });

  it("falls back to neutral styling for unknown statuses", () => {
    const style = resolveSpreadsheetRowStatusStyle("unknown");
    expect(style.baseBg).toBe("background.paper");
  });

  it("prioritizes selection colors over status tint", () => {
    const style = resolveSpreadsheetRowStatusStyle("submitted");
    expect(
      spreadsheetRowBackgroundColor(style, {
        isEvenRow: false,
        isSelected: true,
        isHover: false,
      })
    ).toBe("primary.50");
  });
});
