type TeamTimeoutMap = Record<string, ReturnType<typeof setTimeout>>;

interface PersistCustomMessageParams {
  teamId: string;
  journee: number;
  phase: string;
  customMessage: string;
}

interface PersistCustomMessageResult {
  success: boolean;
}

export async function persistCustomMessage({
  teamId,
  journee,
  phase,
  customMessage,
}: PersistCustomMessageParams): Promise<PersistCustomMessageResult> {
  const response = await fetch("/api/discord/update-custom-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      teamId,
      journee,
      phase,
      customMessage,
    }),
  });

  if (!response.ok) {
    return { success: false };
  }

  const result = (await response.json()) as { success?: boolean };
  return { success: result.success === true };
}

interface ScheduleDebouncedSaveParams {
  timeouts: TeamTimeoutMap;
  teamId: string;
  delayMs: number;
  onSave: () => void;
}

export function scheduleDebouncedTeamSave({
  timeouts,
  teamId,
  delayMs,
  onSave,
}: ScheduleDebouncedSaveParams): void {
  if (timeouts[teamId]) {
    clearTimeout(timeouts[teamId]);
  }
  timeouts[teamId] = setTimeout(onSave, delayMs);
}
