/** True si le montant saisi dépasse le reste dû (trop-perçu). */
export function wouldCreateOverpayment(
  remainingAmountCents: number,
  amountCents: number
): boolean {
  return amountCents > Math.max(0, remainingAmountCents);
}
