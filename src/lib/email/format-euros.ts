/** Formate un montant en centimes pour les e-mails (EUR fr-FR). */
export function formatEurosForEmail(amountCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);
}
