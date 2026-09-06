import { buildStatusPipeline } from "./status-pipeline";

describe("buildStatusPipeline", () => {
  it("calcule stock et cumul vers l'approbation", () => {
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
    expect(pipeline.completionPct).toBe(53);

    const submitted = pipeline.stages[0];
    expect(submitted?.stock).toBe(10);
    expect(submitted?.cumulativeReached).toBe(75);

    const paid = pipeline.stages[3];
    expect(paid?.stock).toBe(12);
    expect(paid?.cumulativeReached).toBe(52);

    const approved = pipeline.stages[4];
    expect(approved?.stock).toBe(40);
    expect(approved?.cumulativeReached).toBe(40);
  });

  it("gère un bucket vide", () => {
    const pipeline = buildStatusPipeline({});
    expect(pipeline.total).toBe(0);
    expect(pipeline.stages).toHaveLength(5);
    expect(pipeline.completionPct).toBe(0);
  });
});
