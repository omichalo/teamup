export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { requireChampionshipRosterActor } from "@/lib/championship/api-auth";
import { rosterParticipationPatchSchema } from "@/lib/championship/schema";
import {
  getChampionshipPlayer,
  upsertChampionshipPlayer,
  upsertPlayerClubProfile,
  getPlayerClubProfile,
  deleteChampionshipPlayer,
} from "@/lib/championship/store";
import { digitsLicense, resolveChampionshipPersonKey } from "@/lib/championship/person-key";

type RouteContext = { params: Promise<{ personKey: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }
    const auth = await requireChampionshipRosterActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }
    const { personKey: rawKey } = await context.params;
    const personKey = decodeURIComponent(rawKey);
    if (!personKey) {
      return jsonNoStore({ error: "Clé personne manquante" }, { status: 400 });
    }

    const parsed = rosterParticipationPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonNoStore({ error: "Données invalides" }, { status: 400 });
    }

    const config = await getActiveRegistrationConfig();
    const seasonLabel = config.meta.seasonLabel;
    const db = getFirestoreAdmin();
    const existing = await getChampionshipPlayer(db, seasonLabel, personKey);
    const patch = parsed.data;

    const nextLicense =
      patch.ffttLicense !== undefined
        ? patch.ffttLicense
        : existing?.ffttLicense ?? (digitsLicense(personKey) || null);
    const resolvedKey =
      resolveChampionshipPersonKey({
        ffttLicense: nextLicense,
        registrationId: existing?.registrationId ?? null,
      }) ?? personKey;

    const coachExcluded = patch.coachExcluded ?? existing?.coachExcluded ?? false;
    const championnat = coachExcluded
      ? false
      : (patch.championnat ?? existing?.championnat ?? false);
    const championnatParis = coachExcluded
      ? false
      : (patch.championnatParis ?? existing?.championnatParis ?? false);
    const coachIncluded =
      !coachExcluded &&
      (championnat || championnatParis) &&
      !(existing?.includedFromDossier ?? false);

    await upsertChampionshipPlayer(db, {
      personKey: resolvedKey,
      seasonLabel,
      registrationId: existing?.registrationId ?? null,
      ffttLicense: nextLicense,
      firstName: patch.firstName ?? existing?.firstName ?? "",
      lastName: patch.lastName ?? existing?.lastName ?? "",
      sex: patch.sex ?? existing?.sex ?? "",
      includedFromDossier: existing?.includedFromDossier ?? false,
      coachIncluded: existing?.coachIncluded || coachIncluded,
      coachExcluded,
      championnat,
      championnatParis,
      paymentStatus: existing?.paymentStatus ?? null,
      registrationStatus: existing?.registrationStatus ?? null,
      licensePresence: existing?.licensePresence ?? "unknown",
      licenseValidationStatus: existing?.licenseValidationStatus ?? null,
      preferredTeams: patch.preferredTeams ??
        existing?.preferredTeams ?? { masculine: [], feminine: [] },
      isTemporary: patch.isTemporary ?? existing?.isTemporary ?? false,
      hasPlayedAtLeastOneMatch: existing?.hasPlayedAtLeastOneMatch,
      hasPlayedAtLeastOneMatchParis: existing?.hasPlayedAtLeastOneMatchParis,
      highestMasculineTeamNumberByPhase: existing?.highestMasculineTeamNumberByPhase,
      highestFeminineTeamNumberByPhase: existing?.highestFeminineTeamNumberByPhase,
      highestTeamNumberByPhaseParis: existing?.highestTeamNumberByPhaseParis,
      masculineMatchesByTeamByPhase: existing?.masculineMatchesByTeamByPhase,
      feminineMatchesByTeamByPhase: existing?.feminineMatchesByTeamByPhase,
      matchesByTeamByPhaseParis: existing?.matchesByTeamByPhaseParis,
    });

    if (patch.discordMentions !== undefined || patch.isWheelchair !== undefined) {
      const currentProfile = await getPlayerClubProfile(db, resolvedKey);
      await upsertPlayerClubProfile(db, {
        personKey: resolvedKey,
        discordMentions:
          patch.discordMentions ?? currentProfile?.discordMentions ?? [],
        isWheelchair: patch.isWheelchair ?? currentProfile?.isWheelchair ?? false,
      });
    }

    logAuditAction(AUDIT_ACTIONS.CHAMPIONSHIP_ROSTER_UPDATED, auth.uid, {
      resource: "championshipRoster",
      resourceId: resolvedKey,
      details: { fields: Object.keys(patch), seasonLabel },
      success: true,
    });

    return jsonNoStore({ success: true, personKey: resolvedKey, seasonLabel });
  } catch (error) {
    console.error("[api/club/championship/roster PATCH]", error);
    return jsonNoStore(
      { error: "Impossible de mettre à jour l'effectif championnat" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }
    const auth = await requireChampionshipRosterActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }
    const { personKey: rawKey } = await context.params;
    const personKey = decodeURIComponent(rawKey);
    if (!personKey) {
      return jsonNoStore({ error: "Clé personne manquante" }, { status: 400 });
    }
    const config = await getActiveRegistrationConfig();
    const seasonLabel = config.meta.seasonLabel;
    const db = getFirestoreAdmin();
    const existing = await getChampionshipPlayer(db, seasonLabel, personKey);
    if (!existing) {
      return jsonNoStore({ error: "Joueur introuvable dans l'effectif" }, { status: 404 });
    }
    if (!existing.isTemporary) {
      return jsonNoStore(
        { error: "Seuls les joueurs temporaires peuvent être supprimés" },
        { status: 403 }
      );
    }
    await deleteChampionshipPlayer(db, seasonLabel, personKey);
    logAuditAction(AUDIT_ACTIONS.CHAMPIONSHIP_ROSTER_DELETED, auth.uid, {
      resource: "championshipRoster",
      resourceId: personKey,
      details: { seasonLabel, isTemporary: true },
      success: true,
    });
    return jsonNoStore({ success: true, personKey, seasonLabel });
  } catch (error) {
    console.error("[api/club/championship/roster DELETE]", error);
    return jsonNoStore(
      { error: "Impossible de supprimer le joueur temporaire" },
      { status: 500 }
    );
  }
}
