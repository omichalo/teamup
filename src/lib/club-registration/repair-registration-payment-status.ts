type RegistrationPaymentRepairRecord = Record<string, unknown>;

function isRegistrationSettled(data: RegistrationPaymentRepairRecord): boolean {
  return data.status === "paid" || data.paidAt != null;
}

function storedPaymentStatusIsPaid(paymentStatus: unknown): boolean {
  return paymentStatus === "paid" || paymentStatus === "complete";
}

/**
 * Dossier réglé (paidAt ou status paid) mais paymentStatus Firestore racine pas aligné.
 * On ne se fie pas à l'objet payment imbriqué : le champ plat peut rester « pending ».
 */
export function needsRegistrationPaymentStatusRepair(
  data: RegistrationPaymentRepairRecord
): boolean {
  if (!isRegistrationSettled(data)) {
    return false;
  }
  return !storedPaymentStatusIsPaid(data.paymentStatus);
}
