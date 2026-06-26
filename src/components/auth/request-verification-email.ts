export type VerificationEmailResult =
  | { ok: true }
  | { ok: false; error: string };

export async function requestVerificationEmail(
  email: string
): Promise<VerificationEmailResult> {
  const res = await fetch("/api/auth/send-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (res.ok) {
    return { ok: true };
  }

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };

  return {
    ok: false,
    error:
      body.message ||
      body.error ||
      "Impossible d'envoyer l'email de vérification",
  };
}
