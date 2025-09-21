import { NextApiRequest, NextApiResponse } from 'next';
import { getClubSettings, getPlayer } from '@/services/firebase';
import { DiscordMessage, DiscordEmbed, DiscordField } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamNumber, composition, matchInfo } = req.body;

    if (!teamNumber || !composition || !matchInfo) {
      return res.status(400).json({ 
        error: 'Missing required parameters: teamNumber, composition, matchInfo' 
      });
    }

    // Récupérer les paramètres du club
    const clubSettings = await getClubSettings();
    if (!clubSettings) {
      return res.status(400).json({ error: 'Club settings not configured' });
    }

    const webhookUrl = clubSettings.discordWebhooks[teamNumber];
    if (!webhookUrl) {
      return res.status(400).json({ 
        error: `Discord webhook not configured for team ${teamNumber}` 
      });
    }

    // Récupérer les informations des joueurs
    const playerPromises = Object.values(composition)
      .filter(Boolean)
      .map(playerId => getPlayer(playerId as string));
    
    const players = await Promise.all(playerPromises);
    const validPlayers = players.filter(Boolean);

    // Créer le message Discord
    const discordMessage = createConvocationMessage(
      teamNumber,
      composition,
      validPlayers,
      matchInfo
    );

    // Envoyer le message
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordMessage),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Convocation sent successfully' 
    });
  } catch (error) {
    console.error('Discord Error:', error);
    res.status(500).json({ 
      error: 'Failed to send convocation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function createConvocationMessage(
  teamNumber: number,
  composition: { A?: string; B?: string; C?: string; D?: string },
  players: any[],
  matchInfo: {
    date: string;
    time: string;
    location: string;
    opponent: string;
    isHome: boolean;
  }
): DiscordMessage {
  const positions = ['A', 'B', 'C', 'D'] as const;
  const fields: DiscordField[] = [];

  // Ajouter les joueurs par position
  positions.forEach(position => {
    const playerId = composition[position];
    if (playerId) {
      const player = players.find(p => p.id === playerId);
      if (player) {
        fields.push({
          name: `Position ${position}`,
          value: `${player.firstName} ${player.lastName} (${player.points} pts)`,
          inline: true,
        });
      }
    }
  });

  // Ajouter les informations du match
  fields.push(
    {
      name: '📅 Date',
      value: matchInfo.date,
      inline: true,
    },
    {
      name: '🕐 Heure',
      value: matchInfo.time,
      inline: true,
    },
    {
      name: '📍 Lieu',
      value: matchInfo.location,
      inline: true,
    },
    {
      name: '⚔️ Adversaire',
      value: matchInfo.opponent,
      inline: true,
    },
    {
      name: '🏠 Domicile/Extérieur',
      value: matchInfo.isHome ? '🏠 Domicile' : '✈️ Extérieur',
      inline: true,
    }
  );

  // Ajouter les rappels
  fields.push({
    name: '📋 Rappels',
    value: '• Tenue réglementaire obligatoire\n• Arrivée 15 minutes avant le match\n• Raquettes et chaussures de sport',
    inline: false,
  });

  const embed: DiscordEmbed = {
    title: `🏓 Convocation - Équipe ${teamNumber}`,
    description: `Composition pour le match contre **${matchInfo.opponent}**`,
    color: 0x1e3a8a, // Bleu marine
    fields,
    timestamp: new Date().toISOString(),
  };

  return {
    embeds: [embed],
  };
}
