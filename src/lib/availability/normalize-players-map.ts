import type { AvailabilityResponse, PlayerAvailability } from "@/lib/services/availability-service";

const DOTTED_PLAYER_FIELD = /^players\.(.+)$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asAvailabilityResponse(value: unknown): AvailabilityResponse | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const response: AvailabilityResponse = {};
  if (typeof value.available === "boolean") {
    response.available = value.available;
  }
  if (typeof value.fridayAvailable === "boolean") {
    response.fridayAvailable = value.fridayAvailable;
  }
  if (typeof value.saturdayAvailable === "boolean") {
    response.saturdayAvailable = value.saturdayAvailable;
  }
  if (typeof value.comment === "string" && value.comment.trim().length > 0) {
    response.comment = value.comment;
  }

  return Object.keys(response).length > 0 ? response : null;
}

/**
 * Lit la map joueurs depuis un document `availabilities`.
 * Gère le format correct (`players.{licence}`) et le format corrompu
 * produit par `set(..., { merge: true })` avec des clés `players.licence`
 * (champs littéraux avec un point).
 */
export function normalizePlayersMap(
  data: Record<string, unknown> | undefined | null
): PlayerAvailability {
  if (!data) {
    return {};
  }

  const players: PlayerAvailability = {};

  if (isPlainObject(data.players)) {
    for (const [playerId, value] of Object.entries(data.players)) {
      const response = asAvailabilityResponse(value);
      if (response) {
        players[playerId] = response;
      }
    }
  }

  for (const [key, value] of Object.entries(data)) {
    const match = DOTTED_PLAYER_FIELD.exec(key);
    if (!match) {
      continue;
    }
    const playerId = match[1];
    if (!playerId || players[playerId]) {
      continue;
    }
    const response = asAvailabilityResponse(value);
    if (response) {
      players[playerId] = response;
    }
  }

  return players;
}
