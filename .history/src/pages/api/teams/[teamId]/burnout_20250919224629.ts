import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestoreAdmin, initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { MatchData } from '@/lib/shared/team-sync';
import { calculateTeamBurnout, DEFAULT_BURNOUT_CONDITIONS } from '@/lib/shared/burnout-conditions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamId } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const firestore = getFirestoreAdmin();
    
    // Récupérer l'équipe
    const teamDoc = await firestore.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const teamData = teamDoc.data();
    const teamName = teamData?.name || 'Équipe inconnue';

    // Récupérer tous les matchs de l'équipe
    const matchesSnapshot = await firestore
      .collection('teams')
      .doc(teamId)
      .collection('matches')
      .get();

    const matches: MatchData[] = matchesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        date: data.date.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as MatchData;
    });

    // Calculer les conditions de brûlage
    const burnoutInfos = calculateTeamBurnout(teamId, teamName, matches, DEFAULT_BURNOUT_CONDITIONS);

    // Séparer les joueurs à risque et les autres
    const atRiskPlayers = burnoutInfos.filter(info => info.isAtRisk);
    const safePlayers = burnoutInfos.filter(info => !info.isAtRisk);

    res.status(200).json({
      success: true,
      data: {
        teamId,
        teamName,
        totalPlayers: burnoutInfos.length,
        atRiskPlayers: atRiskPlayers.length,
        safePlayers: safePlayers.length,
        players: {
          atRisk: atRiskPlayers,
          safe: safePlayers
        },
        conditions: DEFAULT_BURNOUT_CONDITIONS
      }
    });

  } catch (error) {
    console.error('Error fetching burnout info:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
