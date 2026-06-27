import { resolveSpreadsheetTableDensity } from "./table-density";

describe("table-density", () => {
  it("defaults to comfortable for unknown values", () => {
    expect(resolveSpreadsheetTableDensity(undefined)).toBe("comfortable");
    expect(resolveSpreadsheetTableDensity("compact")).toBe("compact");
  });
});
