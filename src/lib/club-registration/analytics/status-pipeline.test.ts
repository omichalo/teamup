import { buildStatusPipeline } from "./status-pipeline";

describe("buildStatusPipeline", () => {
  it("fusionne payés et validés à 0 € dans l'étape Payé", () => {
    const pipeline = buildStatusPipeline({
      submitted: 10,
      in_review: 5,
      payment_requested: 8,
      paid: 12,
      approved: 40,
      rejected: 5,
    });

    expect(pipeline.mainPathTotal).toBe(75);
    expect(pipeline.rejected).toBe(5);
    expect(pipeline.stages).toHaveLength(4);
    expect(pipeline.completionPct).toBe(69);

    const submitted = pipeline.stages[0];
    expect(submitted?.stock).toBe(10);
    expect(submitted?.cumulativeReached).toBe(75);

    const paid = pipeline.stages[3];
    expect(paid?.id).toBe("paid");
    expect(paid?.label).toBe("Payé");
    expect(paid?.stock).toBe(52);
    expect(paid?.cumulativeReached).toBe(52);
    expect(paid?.cumulativePct).toBe(69);
  });

  it("gère un bucket vide", () => {
    const pipeline = buildStatusPipeline({});
    expect(pipeline.total).toBe(0);
    expect(pipeline.stages).toHaveLength(4);
    expect(pipeline.completionPct).toBe(0);
  });
});
