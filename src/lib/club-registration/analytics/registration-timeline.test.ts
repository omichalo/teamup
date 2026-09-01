import { buildRegistrationTimeline, toRegistrationDateKey } from "./registration-timeline";
import type { AnalyticsRegistrationRecord } from "./types";

describe("toRegistrationDateKey", () => {
  it("convertit un instant ISO en date Paris", () => {
    expect(toRegistrationDateKey("2026-09-15T22:00:00.000Z")).toBe("2026-09-16");
  });
});

describe("buildRegistrationTimeline", () => {
  const record = (submittedAt?: string): AnalyticsRegistrationRecord => ({
    submittedAt,
    status: "approved",
  });

  it("agrège par jour et calcule le cumul", () => {
    const timeline = buildRegistrationTimeline([
      record("2026-09-01T10:00:00.000Z"),
      record("2026-09-01T18:00:00.000Z"),
      record("2026-09-03T08:00:00.000Z"),
    ]);

    expect(timeline.points).toHaveLength(2);
    expect(timeline.points[0]).toMatchObject({ date: "2026-09-01", dailyCount: 2, cumulativeCount: 2 });
    expect(timeline.points[1]).toMatchObject({ date: "2026-09-03", dailyCount: 1, cumulativeCount: 3 });
    expect(timeline.totalUnknownDate).toBe(0);
  });

  it("ignore les dossiers sans date d'inscription", () => {
    const timeline = buildRegistrationTimeline([record(), record("2026-09-02T12:00:00.000Z")]);
    expect(timeline.points).toHaveLength(1);
    expect(timeline.totalUnknownDate).toBe(1);
    expect(timeline.totalWithDate).toBe(1);
  });
});
