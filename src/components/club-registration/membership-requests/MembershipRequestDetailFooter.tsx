"use client";

import { Stack } from "@mui/material";
import { SecretariatPaymentNotesSection } from "../secretariat/SecretariatPaymentNotesSection";
import { RegistrationPaymentDocumentsActions } from "@/components/club-registration/RegistrationPaymentDocumentsActions";
import { isRegistrationPaymentSettled } from "@/lib/club-registration/resolve-settled-request-payment";
import { resolveOnlinePayableCents } from "@/lib/club-registration/payment/resolve-remaining-payable";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { DeleteRegistrationSection } from "./DeleteRegistrationSection";
import type { MembershipRequestDetailState } from "./useMembershipRequestDetail";
import type { MembershipListReloadFn } from "./types";

type Props = {
  detail: MembershipRequestDetailState;
  onListReload?: MembershipListReloadFn | undefined;
  onDeleted?: (() => void | Promise<void>) | undefined;
};

export function MembershipRequestDetailFooter({
  detail,
  onListReload,
  onDeleted,
}: Props) {
  const {
    registrationId,
    selected,
    form,
    selectedPayment,
    saving,
    requestingPayment,
    persistingQuote,
    updateField,
    save,
    requestPayment,
  } = detail;

  if (!selected || !form) return null;

  const paidAmountCents =
    selectedPayment?.paidAmountCents ??
    (typeof selected.paymentAmountCents === "number" &&
    (selected.status === "paid" || selected.paymentStatus === "paid")
      ? selected.paymentAmountCents
      : 0);
  const remainingAmountCents = selectedPayment?.remainingAmountCents ?? 0;
  const hasActiveReceived =
    (selectedPayment?.receivedPayments ?? []).some(
      (line) => !line.reversedAt && line.amountCents > 0
    ) ||
    selected.status === "paid" ||
    selected.paymentStatus === "paid" ||
    selected.paymentStatus === "complete" ||
    Boolean(selected.paidAt);
  const invoiceAvailable =
    ((selectedPayment?.amountToPayCents ?? selected.paymentAmountCents ?? 0) > 0 ||
      (selectedPayment?.totalAmountCents ?? 0) > 0 ||
      Boolean(selected.pricingQuote)) &&
    (paidAmountCents > 0 ||
      selectedPayment?.paymentStatus === "paid" ||
      selectedPayment?.paymentStatus === "partially_paid" ||
      selected.status === "paid" ||
      selected.paymentStatus === "paid");
  const receiptAvailable = paidAmountCents > 0 || hasActiveReceived;

  return (
    <Stack spacing={2}>
      {registrationId && (invoiceAvailable || receiptAvailable) ? (
        <RegistrationPaymentDocumentsActions
          registrationId={registrationId}
          invoiceAvailable={invoiceAvailable}
          receiptAvailable={receiptAvailable}
          receiptPartial={remainingAmountCents > 0 && paidAmountCents > 0}
        />
      ) : null}

      <SecretariatPaymentNotesSection
        amountEuros={form.amountEuros}
        reviewNotes={form.reviewNotes}
        onAmountEurosChange={(value) => updateField("amountEuros", value)}
        onReviewNotesChange={(value) => updateField("reviewNotes", value)}
        registrationStatus={selected.status ?? null}
        paymentRequestedAt={selected.paymentRequestedAt ?? null}
        paymentAmountCents={
          selectedPayment?.amountToPayCents ?? selected.paymentAmountCents ?? null
        }
        paymentEmailSentTo={selected.paymentEmailSentTo ?? null}
        paymentMethod={selectedPayment?.paymentMethod}
        remainingAmountCents={selectedPayment?.remainingAmountCents ?? null}
        paidAmountCents={selectedPayment?.paidAmountCents ?? null}
        onlinePayableCents={
          selectedPayment ? resolveOnlinePayableCents(selectedPayment) : null
        }
        paymentSettled={isRegistrationPaymentSettled(
          {
            status: selected.status,
            paymentStatus: selected.paymentStatus,
            paidAt: selected.paidAt,
          },
          selectedPayment
        )}
        saving={saving}
        requestingPayment={requestingPayment}
        persistingQuote={persistingQuote}
        onSave={() => void save()}
        onRequestPayment={requestPayment}
        onRequestOnlinePayment={() => requestPayment("stripe")}
        onRequestFullRemainingOnline={() =>
          requestPayment("stripe", { charge: "remaining" })
        }
      />

      {registrationId ? (
        <DeleteRegistrationSection
          registrationId={registrationId}
          firstName={form.firstName}
          lastName={form.lastName}
          adherentDisplayName={formatPersonDisplayName(form.firstName, form.lastName)}
          status={selected.status ?? null}
          disabled={saving || requestingPayment || persistingQuote}
          onDeleted={async () => {
            await onListReload?.({ advance: "always" });
            await onDeleted?.();
          }}
        />
      ) : null}
    </Stack>
  );
}
