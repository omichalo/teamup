import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Player } from '@/types';

export const usePlayers = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        const playersQuery = query(
          collection(db, 'players'),
          orderBy('lastName', 'asc')
        );
        
        const snapshot = await getDocs(playersQuery);
        const playersData: Player[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          playersData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Player);
        });

        setPlayers(playersData);
        console.log(`${playersData.length} joueurs chargés depuis Firestore`);

      } catch (error) {
        console.error('Erreur chargement joueurs:', error);
        setError(error instanceof Error ? error.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return { players, loading, error };
};
