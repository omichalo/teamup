import { AvailabilityServiceAdmin } from "@/lib/services/availability-service-admin";
import type { AvailabilityResponse } from "@/lib/services/availability-service";

export type WomenTeamDayAvailability = {
  fridayAvailable?: boolean;
  saturdayAvailable?: boolean;
  comment?: string;
};

/**
 * VEN est stocké sur le doc masculin, SAM sur le doc féminin.
 * Reconstruit l'état affiché Discord / TeamUp à partir des deux docs.
 */
export function mergeWomenTeamAvailability(
  masculinResponse?: AvailabilityResponse | null,
  femininResponse?: AvailabilityResponse | null
): WomenTeamDayAvailability {
  const fridayAvailable =
    typeof masculinResponse?.fridayAvailable === "boolean"
      ? masculinResponse.fridayAvailable
      : typeof masculinResponse?.available === "boolean"
        ? masculinResponse.available
        : undefined;

  const saturdayAvailable =
    typeof femininResponse?.saturdayAvailable === "boolean"
      ? femininResponse.saturdayAvailable
      : typeof femininResponse?.available === "boolean"
        ? femininResponse.available
        : undefined;

  const comment =
    masculinResponse?.comment?.trim() ||
    femininResponse?.comment?.trim() ||
    undefined;

  return {
    ...(fridayAvailable !== undefined ? { fridayAvailable } : {}),
    ...(saturdayAvailable !== undefined ? { saturdayAvailable } : {}),
    ...(comment ? { comment } : {}),
  };
}

export function applyWomenDaySelection(
  current: WomenTeamDayAvailability,
  day: "ven" | "sat",
  isAvailable: boolean
): WomenTeamDayAvailability {
  if (day === "ven") {
    return { ...current, fridayAvailable: isAvailable };
  }
  return { ...current, saturdayAvailable: isAvailable };
}

/**
 * Construit la payload d'un seul championnat pour un jour donné,
 * en préservant le commentaire déjà présent sur ce doc.
 * Retourne undefined si rien à écrire (évite un delete Firestore).
 */
export function buildWomenChampionshipDayUpdate(
  day: "ven" | "sat",
  isAvailable: boolean,
  existingOnTargetDoc?: AvailabilityResponse | null
): AvailabilityResponse | undefined {
  const comment = existingOnTargetDoc?.comment?.trim();
  if (day === "ven") {
    return {
      available: isAvailable,
      fridayAvailable: isAvailable,
      ...(comment ? { comment } : {}),
    };
  }
  return {
    available: isAvailable,
    saturdayAvailable: isAvailable,
    ...(comment ? { comment } : {}),
  };
}

export async function loadWomenTeamAvailability(
  availabilityService: AvailabilityServiceAdmin,
  journee: number,
  phase: "aller" | "retour",
  playerId: string,
  idEpreuve?: number
): Promise<{
  merged: WomenTeamDayAvailability;
  masculinResponse?: AvailabilityResponse;
  femininResponse?: AvailabilityResponse;
}> {
  const [masculinAvailability, femininAvailability] = await Promise.all([
    availabilityService.getAvailability(journee, phase, "masculin", idEpreuve),
    availabilityService.getAvailability(journee, phase, "feminin", idEpreuve),
  ]);

  const masculinResponse = masculinAvailability?.players[playerId];
  const femininResponse = femininAvailability?.players[playerId];

  return {
    merged: mergeWomenTeamAvailability(masculinResponse, femininResponse),
    ...(masculinResponse ? { masculinResponse } : {}),
    ...(femininResponse ? { femininResponse } : {}),
  };
}

/**
 * Met à jour uniquement le document concerné (VEN→masculin, SAM→féminin).
 */
export async function saveWomenTeamDaySelection(
  availabilityService: AvailabilityServiceAdmin,
  params: {
    journee: number;
    phase: "aller" | "retour";
    playerId: string;
    day: "ven" | "sat";
    isAvailable: boolean;
    idEpreuve?: number;
  }
): Promise<WomenTeamDayAvailability> {
  const { journee, phase, playerId, day, isAvailable, idEpreuve } = params;

  const { merged, masculinResponse, femininResponse } =
    await loadWomenTeamAvailability(
      availabilityService,
      journee,
      phase,
      playerId,
      idEpreuve
    );

  const next = applyWomenDaySelection(merged, day, isAvailable);
  const existingOnTarget =
    day === "ven" ? masculinResponse : femininResponse;
  const payload = buildWomenChampionshipDayUpdate(
    day,
    isAvailable,
    existingOnTarget
  );

  if (payload) {
    await availabilityService.updatePlayerAvailability(
      journee,
      phase,
      day === "ven" ? "masculin" : "feminin",
      playerId,
      payload,
      idEpreuve
    );
  }

  return next;
}
