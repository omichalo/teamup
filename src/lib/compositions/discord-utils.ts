import type { Player } from "@/types/team-management";
import type { DiscordMember } from "@/types/discord";

/**
 * Détermine le statut Discord d'un joueur
 * @param player - Le joueur à vérifier
 * @param discordMembers - La liste des membres Discord valides
 * @returns "none" si aucun login Discord, "invalid" si au moins un login n'existe plus, "valid" sinon
 */
export function getDiscordStatus(
  player: Player,
  discordMembers: DiscordMember[]
): "none" | "invalid" | "valid" {
  if (!player.discordMentions || player.discordMentions.length === 0) {
    return "none";
  }
  const validMemberIds = new Set(discordMembers.map((m) => m.id));
  const hasInvalidMention = player.discordMentions.some(
    (mentionId) => !validMemberIds.has(mentionId)
  );
  return hasInvalidMention ? "invalid" : "valid";
}

