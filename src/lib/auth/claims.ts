import { IdTokenResult } from "firebase/auth";
import { CoachRequestStatus, UserRole } from "@/types";
import {
  DEFAULT_COACH_REQUEST_STATUS,
  DEFAULT_ROLE,
  resolveCoachRequestStatus,
  resolveRole,
} from "@/lib/auth/roles";

export const ROLE_CLAIM_KEY = "role";
export const COACH_REQUEST_STATUS_CLAIM_KEY = "coachRequestStatus";

export const extractRoleFromClaims = (
  claims: Record<string, unknown> | undefined
): UserRole => {
  if (!claims) {
    return DEFAULT_ROLE;
  }

  const raw = claims[ROLE_CLAIM_KEY];
  return resolveRole(typeof raw === "string" ? raw : null);
};

export const extractCoachRequestStatusFromClaims = (
  claims: Record<string, unknown> | undefined
): CoachRequestStatus => {
  if (!claims) {
    return DEFAULT_COACH_REQUEST_STATUS;
  }

  const raw = claims[COACH_REQUEST_STATUS_CLAIM_KEY];
  return resolveCoachRequestStatus(typeof raw === "string" ? raw : null);
};

export interface TokenClaimsInfo {
  role: UserRole;
  coachRequestStatus: CoachRequestStatus;
}

export const extractClaimsInfo = (
  tokenResult: IdTokenResult | null | undefined
): TokenClaimsInfo => {
  const claims = tokenResult?.claims;
  return {
    role: extractRoleFromClaims(claims),
    coachRequestStatus: extractCoachRequestStatusFromClaims(claims),
  };
};

