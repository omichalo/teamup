import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import {
  hasRegistrationOutstandingBalance,
  isRegistrationSupplementDue,
} from "@/lib/club-registration/payment/registration-supplement";
import { resolveOnlinePayableCents } from "@/lib/club-registration/payment/resolve-remaining-payable";
import {
  MES_INSCRIPTION_SUPPLEMENT_STATUS_LABEL,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";

export type MesInscriptionLike = {
  status?: string;
  paymentStatus?: string;
  paymentAmountCents?: number;
  payment?: Record<string, unknown>;
};

export type MesInscriptionStatusPresentation = {
  label: string;
  color: "default" | "warning" | "success" | "error";
  supplementDue: boolean;
  payableLabel: string | null;
};

export function resolveMesInscriptionSupplementDue(
  registration: MesInscriptionLike
): boolean {
  const payment = normalizeRegistrationPayment(
    registration as unknown as Record<string, unknown>
  );
  return payment != null && isRegistrationSupplementDue(payment);
}

export function resolveMesInscriptionStatusPresentation(
  registration: MesInscriptionLike,
  statusLabels: Record<string, string>,
  statusColors: Record<string, "default" | "warning" | "success" | "error">
): MesInscriptionStatusPresentation {
  const payment = normalizeRegistrationPayment(
    registration as unknown as Record<string, unknown>
  );
  const supplementDue = payment != null && isRegistrationSupplementDue(payment);
  const status = registration.status ?? "";

  if (supplementDue) {
    const online = payment ? resolveOnlinePayableCents(payment) : 0;
    const payableCents =
      online > 0 ? online : payment?.remainingAmountCents ?? registration.paymentAmountCents;
    const payableLabel =
      typeof payableCents === "number"
        ? new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
          }).format(payableCents / 100)
        : null;
    return {
      label: MES_INSCRIPTION_SUPPLEMENT_STATUS_LABEL,
      color: "warning",
      supplementDue: true,
      payableLabel,
    };
  }

  return {
    label: statusLabels[status] ?? status ?? "—",
    color: statusColors[status] ?? "default",
    supplementDue: false,
    payableLabel: null,
  };
}

export function isMesInscriptionFullyPaid(registration: MesInscriptionLike): boolean {
  const payment = normalizeRegistrationPayment(
    registration as unknown as Record<string, unknown>
  );
  if (payment && hasRegistrationOutstandingBalance(payment)) {
    return false;
  }
  return (
    registration.status === "paid" ||
    registration.paymentStatus === "paid" ||
    registration.paymentStatus === "complete"
  );
}
