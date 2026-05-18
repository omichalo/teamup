export type FFTTLicenseLookupPlayer = {
  licence: string;
  nom?: string;
  prenom?: string;
  isHomme?: boolean;
  numClub?: string;
  nomClub?: string;
  categorie?: string;
  typeLicence?: string | null;
  certificat?: string;
  nationalite?: string;
  pointsLicence?: number | null;
};

export type FFTTLicenseLookupResult =
  | { ok: true; found: true; player: FFTTLicenseLookupPlayer }
  | { ok: true; found: false }
  | { ok: false; error: string };

export function normalizeFFTTLicenseInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 12);
}

export async function lookupFFTTLicense(
  licence: string
): Promise<FFTTLicenseLookupResult> {
  let res: Response;
  try {
    res = await fetch("/api/club/registration/license-lookup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licence }),
    });
  } catch {
    return {
      ok: false,
      error: "Connexion impossible avec le serveur.",
    };
  }

  let json: unknown = {};
  try {
    json = await res.json();
  } catch {
    /* Réponse non JSON : géré ci-dessous par message générique. */
  }

  if (!res.ok) {
    const body = json as { error?: string; message?: string };
    return {
      ok: false,
      error:
        body.message ||
        body.error ||
        "Impossible de rechercher cette licence pour le moment.",
    };
  }

  const body = json as {
    found?: boolean;
    player?: FFTTLicenseLookupPlayer;
  };

  if (body.found && body.player) {
    return { ok: true, found: true, player: body.player };
  }

  return { ok: true, found: false };
}
