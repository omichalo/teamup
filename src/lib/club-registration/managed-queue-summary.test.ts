import {
  getManagedListPipelineTabCounts,
  getManagedListQueueViewCounts,
  summarizeManagedQueue,
} from "./managed-queue-summary";

describe("summarizeManagedQueue", () => {
  it("counts work queues from dossier summaries", () => {
    const summary = summarizeManagedQueue(
      [
        {
          id: "a",
          status: "submitted",
          medicalCertificateStatus: "required_not_received",
          medicalCertificateDeclaration: "questionnaire_yes_certificate_required",
        },
        {
          id: "b",
          status: "payment_requested",
          paymentStatus: "waiting_payment",
          paymentAids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 5000, received: false }],
        },
        { id: "c", status: "paid" },
      ],
      500
    );

    expect(summary.actionable).toBe(2);
    expect(summary.paymentRequested).toBe(1);
    expect(summary.pendingAidReceipt).toBe(1);
    expect(summary.missingCertificate).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.truncated).toBe(false);
    expect(summary.byStatus).toEqual({
      submitted: 1,
      in_review: 0,
      payment_requested: 1,
      paid: 1,
      approved: 0,
      rejected: 0,
    });
    expect(getManagedListQueueViewCounts(summary)).toEqual({
      to_review: 2,
      payment_pending: 1,
      pending_aid_receipt: 1,
      all: 3,
    });
    expect(getManagedListPipelineTabCounts(summary, "to_review").submitted).toBe(1);
    expect(getManagedListPipelineTabCounts(summary, "pending_aid_receipt").payment_requested).toBe(
      1
    );
  });
});
