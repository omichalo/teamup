import { useState, useEffect } from "react";
import { Player } from "@/types";

interface FFTTPlayersData {
  players: Player[];
  total: number;
  clubCode: string;
  loading: boolean;
  error: string | null;
}

export const useFFTTPlayers = (clubCode: string = "08781477") => {
  const [data, setData] = useState<FFTTPlayersData>({
    players: [],
    total: 0,
    clubCode: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await fetch(`/api/fftt/players?clubCode=${clubCode}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        setData({
          players: result.players || [],
          total: result.total || 0,
          clubCode: result.clubCode || clubCode,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching FFTT players:", error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    };

    if (clubCode) {
      fetchPlayers();
    }
  }, [clubCode]);

  return data;
};
