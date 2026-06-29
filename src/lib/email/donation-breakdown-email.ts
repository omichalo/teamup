import { SQYPING_COLORS } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import type { DonationPricingBreakdown } from "@/lib/pricing/donation-discount";
import { formatEurosForEmail } from "@/lib/email/format-euros";
import type { PaymentAid } from "@/lib/club-registration/payment/types";

export function formatSecretariatAidsBreakdownText(aids: PaymentAid[]): string {
  return aids
    .filter((aid) => aid.amountCents > 0)
    .map((aid) => `  - ${aid.label} : −${formatEurosForEmail(aid.amountCents)}`)
    .join("\n");
}

export function formatSecretariatAidsBreakdownHtml(aids: PaymentAid[]): string {
  return aids
    .filter((aid) => aid.amountCents > 0)
    .map(
      (aid) => `
    <tr>
      <td style="padding: 10px 12px; font-size: 15px; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider};">
        ${escapeHtml(aid.label)}
      </td>
      <td align="right" style="padding: 10px 12px; font-size: 15px; font-weight: 600; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider}; white-space: nowrap;">
        −${escapeHtml(formatEurosForEmail(aid.amountCents))}
      </td>
    </tr>
  `
    )
    .join("");
}

export function formatDonationBreakdownText(
  donation: DonationPricingBreakdown
): string {
  if (donation.voluntaryDonationCents <= 0) {
    return "";
  }
  return [
    `  - Don libre au club : ${formatEurosForEmail(donation.voluntaryDonationCents)}`,
    `  - Remise don 25 % (plaf. 73 €) : −${formatEurosForEmail(donation.donationDiscountCents)}`,
  ].join("\n");
}

export function formatDonationBreakdownHtml(
  donation: DonationPricingBreakdown
): string {
  if (donation.voluntaryDonationCents <= 0) {
    return "";
  }

  return `
    <tr>
      <td style="padding: 10px 12px; font-size: 15px; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider};">
        Don libre au club
      </td>
      <td align="right" style="padding: 10px 12px; font-size: 15px; font-weight: 600; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider}; white-space: nowrap;">
        ${escapeHtml(formatEurosForEmail(donation.voluntaryDonationCents))}
      </td>
    </tr>
    <tr>
      <td style="padding: 10px 12px; font-size: 15px; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider};">
        Remise don 25 % (plaf. 73 €)
      </td>
      <td align="right" style="padding: 10px 12px; font-size: 15px; font-weight: 600; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider}; white-space: nowrap;">
        −${escapeHtml(formatEurosForEmail(donation.donationDiscountCents))}
      </td>
    </tr>
  `;
}

export function resolveEmailPayableTotalCents(
  quoteTotalCents: number,
  donation?: DonationPricingBreakdown | null
): number {
  return donation?.invoiceTotalCents ?? quoteTotalCents;
}
