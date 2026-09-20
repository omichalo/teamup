export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { resolveSuggestionSession } from "@/lib/app-suggestions/api-auth";
import {
  SUGGESTION_EMAIL_PREFERENCES,
  resolveSuggestionEmailPreference,
  type SuggestionEmailPreference,
} from "@/lib/app-suggestions/email-preferences";
import { getSuggestionEmailPreference } from "@/lib/app-suggestions/user-email";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { z } from "zod";

const patchSchema = z.object({
  preference: z.enum(SUGGESTION_EMAIL_PREFERENCES),
});

/** GET /api/club/suggestions/preferences — préférence e-mail de l'utilisateur. */
export async function GET() {
  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  try {
    const preference = await getSuggestionEmailPreference(
      auth.session.db,
      auth.session.uid
    );
    return jsonNoStore({ preference }, { status: 200 });
  } catch (error) {
    console.error("[api/club/suggestions/preferences GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger la préférence" },
      { status: 500 }
    );
  }
}

/** PATCH /api/club/suggestions/preferences — met à jour la préférence e-mail. */
export async function PATCH(req: Request) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const auth = await resolveSuggestionSession();
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonNoStore({ error: "Données invalides" }, { status: 400 });
  }

  const preference: SuggestionEmailPreference = resolveSuggestionEmailPreference(
    parsed.data.preference
  );

  try {
    await auth.session.db.collection("users").doc(auth.session.uid).set(
      { suggestionEmailPreference: preference },
      { merge: true }
    );
    return jsonNoStore({ preference }, { status: 200 });
  } catch (error) {
    console.error("[api/club/suggestions/preferences PATCH]", error);
    return jsonNoStore(
      { error: "Impossible d'enregistrer la préférence" },
      { status: 500 }
    );
  }
}
