"use client";

import { SecretariatPaymentNotesSection } from "../secretariat/SecretariatPaymentNotesSection";
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

  return (
    <>
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
    </>
  );
}
