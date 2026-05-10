export interface DiscordSentState {
  sent: boolean;
  sentAt?: string;
  customMessage?: string;
}

interface SendDiscordMessageParams {
  teamId: string;
  content: string;
  journee: number;
  phase: string;
  customMessage: string;
  channelId: string | undefined;
}

interface SendDiscordMessageResult {
  success: boolean;
  error?: string;
}

export async function sendDiscordMessage({
  teamId,
  content,
  journee,
  phase,
  customMessage,
  channelId,
}: SendDiscordMessageParams): Promise<SendDiscordMessageResult> {
  const response = await fetch("/api/discord/send-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      content,
      teamId,
      journee,
      phase,
      customMessage,
      channelId,
    }),
  });

  const payload = (await response.json()) as {
    success?: boolean;
    error?: string;
  };

  if (response.ok && payload.success) {
    return { success: true };
  }

  return {
    success: false,
    error: payload.error || "Erreur inconnue",
  };
}

export function buildSentStatusUpdate(
  existing: DiscordSentState | undefined,
  customMessage: string
): DiscordSentState {
  return {
    sent: true,
    sentAt: new Date().toISOString(),
    ...(customMessage || existing?.customMessage
      ? { customMessage: customMessage || existing?.customMessage || "" }
      : {}),
  };
}
