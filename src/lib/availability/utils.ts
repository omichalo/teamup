import { AvailabilityResponse } from "@/lib/services/availability-service";
import { ChampionshipType } from "@/types";

export type PlayerAvailabilityByType = {
  masculin?: AvailabilityResponse;
  feminin?: AvailabilityResponse;
};

export type AvailabilityState = Record<string, PlayerAvailabilityByType>;

export const sanitizeAvailabilityEntry = (
  entry?: AvailabilityResponse | null
): AvailabilityResponse | undefined => {
  if (!entry) {
    return undefined;
  }

  const sanitized: AvailabilityResponse = {};

  if (typeof entry.available === "boolean") {
    sanitized.available = entry.available;
  }

  if (typeof entry.comment === "string") {
    const trimmed = entry.comment.trim();
    if (trimmed.length > 0) {
      sanitized.comment = trimmed;
    }
  }

  if (sanitized.available === undefined && sanitized.comment === undefined) {
    return undefined;
  }

  return sanitized;
};

export const availabilityEntriesEqual = (
  current?: AvailabilityResponse | null,
  next?: AvailabilityResponse | null,
  skipNormalization: boolean = false
): boolean => {
  const normalizedCurrent = skipNormalization
    ? current
    : sanitizeAvailabilityEntry(current);
  const normalizedNext = skipNormalization ? next : sanitizeAvailabilityEntry(next);

  if (!normalizedCurrent && !normalizedNext) {
    return true;
  }
  if (!normalizedCurrent || !normalizedNext) {
    return false;
  }

  return (
    normalizedCurrent.available === normalizedNext.available &&
    normalizedCurrent.comment === normalizedNext.comment
  );
};

export const updateAvailabilityState = (
  previousState: AvailabilityState,
  playerId: string,
  championshipType: ChampionshipType,
  computeNextEntry: (
    currentEntry: AvailabilityResponse | undefined
  ) => AvailabilityResponse | undefined,
  skipNormalization: boolean = false
): { nextState: AvailabilityState; changed: boolean } => {
  const currentPlayerState = previousState[playerId];
  const currentEntry = currentPlayerState?.[championshipType];

  const computedEntry = computeNextEntry(currentEntry);

  const normalizedCurrent = skipNormalization
    ? currentEntry
    : sanitizeAvailabilityEntry(currentEntry);
  const normalizedNext = skipNormalization
    ? computedEntry
    : sanitizeAvailabilityEntry(computedEntry);

  if (availabilityEntriesEqual(normalizedCurrent, normalizedNext, skipNormalization)) {
    return { nextState: previousState, changed: false };
  }

  const nextState: AvailabilityState = { ...previousState };

  if (skipNormalization) {
    if (
      !computedEntry ||
      (computedEntry.available === undefined &&
        (!computedEntry.comment || computedEntry.comment.trim().length === 0))
    ) {
      if (!currentPlayerState) {
        return { nextState: previousState, changed: false };
      }

      const nextPlayerState: PlayerAvailabilityByType = {
        ...currentPlayerState,
      };
      delete nextPlayerState[championshipType];

      if (Object.keys(nextPlayerState).length === 0) {
        delete nextState[playerId];
      } else {
        nextState[playerId] = nextPlayerState;
      }

      return { nextState, changed: true };
    }

    const nextPlayerState: PlayerAvailabilityByType = {
      ...(currentPlayerState ?? {}),
      [championshipType]: { ...computedEntry },
    };

    nextState[playerId] = nextPlayerState;

    return { nextState, changed: true };
  }

  if (!normalizedNext) {
    if (!currentPlayerState) {
      return { nextState: previousState, changed: false };
    }

    const nextPlayerState: PlayerAvailabilityByType = {
      ...currentPlayerState,
    };
    delete nextPlayerState[championshipType];

    if (Object.keys(nextPlayerState).length === 0) {
      delete nextState[playerId];
    } else {
      nextState[playerId] = nextPlayerState;
    }

    return { nextState, changed: true };
  }

  const sanitizedEntry: AvailabilityResponse = {
    ...normalizedNext,
  };

  const nextPlayerState: PlayerAvailabilityByType = {
    ...(currentPlayerState ?? {}),
    [championshipType]: sanitizedEntry,
  };

  nextState[playerId] = nextPlayerState;

  return { nextState, changed: true };
};

export const buildPlayersPayload = (
  state: AvailabilityState,
  championshipType: ChampionshipType
): Record<string, AvailabilityResponse> => {
  const payload: Record<string, AvailabilityResponse> = {};

  Object.entries(state).forEach(([playerId, playerState]) => {
    const entry = sanitizeAvailabilityEntry(playerState[championshipType]);
    if (entry) {
      payload[playerId] = entry;
    }
  });

  return payload;
};
