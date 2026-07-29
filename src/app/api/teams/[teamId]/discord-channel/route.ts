import { jsonNoStore } from "@/lib/http/cache-headers";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

export const runtime = "nodejs";

export const PATCH = withAuth(async (req, context) => {
  const { teamId } = (context as { params: Promise<{ teamId: string }> }).params
    ? await (context as { params: Promise<{ teamId: string }> }).params
    : { teamId: undefined };

  if (!teamId) {
    return jsonNoStore(
      { error: "L'identifiant de l'équipe est requis" },
      { status: 400 }
    );
  }

  const { decoded } = context as { decoded: { uid: string } };

  try {
    // CSRF Protection
    if (!validateOrigin(req as NextRequest)) {
      return jsonNoStore(
        { success: false, error: "Origine invalide" },
        { status: 403 }
      );
    }

    const { discordChannelId } = await (req as NextRequest).json();

    if (
      discordChannelId !== null &&
      discordChannelId !== undefined &&
      typeof discordChannelId !== "string"
    ) {
      return jsonNoStore(
        {
          error: "Le canal Discord doit être une chaîne de caractères ou null",
        },
        { status: 400 }
      );
    }

    const teamRef = adminDb.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      return jsonNoStore(
        {
          error: "Équipe introuvable",
        },
        { status: 404 }
      );
    }

    // Mettre à jour le canal Discord de l'équipe
    const updateData: { discordChannelId?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (
      discordChannelId === null ||
      discordChannelId === undefined ||
      discordChannelId.trim() === ""
    ) {
      updateData.discordChannelId = null;
    } else {
      updateData.discordChannelId = discordChannelId.trim();
    }

    await teamRef.update(updateData);

    // Audit logging
    logAuditAction(AUDIT_ACTIONS.TEAM_UPDATED, decoded.uid, {
      resource: "team",
      resourceId: teamId,
      details: { discordChannelId: updateData.discordChannelId },
      success: true,
    });

    return jsonNoStore({
      success: true,
      data: {
        teamId,
        discordChannelId: updateData.discordChannelId || null,
      },
    });
  } catch (error) {
    console.error(
      `[app/api/teams/${teamId}/discord-channel] PATCH error`,
      error
    );
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la mise à jour du canal Discord",
      },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
