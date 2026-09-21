import { isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import type { UnregisteredPlayCompetition } from "./unregistered-play-follow-up";

/**
 * Dossier réglé (ou approuvé) avec option championnat / Paris :
 * le secrétariat considère l’option comme payée.
 */
export function isPaidChampionshipRegistration(data: Record<string, unknown>): boolean {
  if (data.status === "rejected") return false;
  if (data.status === "approved") return true;
  return isRegistrationPaidRecord(data);
}

export type PaidChampionshipNotPlayedItem = {
  personKey: string;
  competition: UnregisteredPlayCompetition;
  firstName: string;
  lastName: string;
  displayName: string;
  ffttLicense: string | null;
  registrationId: string;
  registrationStatus: string | null;
};
