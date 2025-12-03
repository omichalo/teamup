import { useEffect, useState, useCallback } from "react";

export interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
}

let cachedMembers: DiscordMember[] | null = null;
let cachedError: string | null = null;
let ongoingFetch: Promise<DiscordMember[] | null> | null = null;

async function fetchDiscordMembers(): Promise<DiscordMember[] | null> {
  if (cachedMembers) {
    return cachedMembers;
  }

  if (ongoingFetch) {
    return ongoingFetch;
  }

  ongoingFetch = fetch("/api/discord/members", {
    method: "GET",
    credentials: "include",
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      if (result.success) {
        cachedMembers = result.members || [];
        cachedError = null;
        return cachedMembers;
      }

      throw new Error(result.error || "Impossible de charger les membres Discord");
    })
    .catch((error: unknown) => {
      cachedError = error instanceof Error ? error.message : "Erreur inconnue";
      cachedMembers = null;
      return null;
    })
    .finally(() => {
      ongoingFetch = null;
    });

  return ongoingFetch;
}

export function useDiscordMembers() {
  const [members, setMembers] = useState<DiscordMember[]>(cachedMembers || []);
  const [loading, setLoading] = useState(!cachedMembers && !cachedError);
  const [error, setError] = useState<string | null>(cachedError);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    cachedMembers = null;
    cachedError = null;
    const result = await fetchDiscordMembers();
    if (result) {
      setMembers(result);
      setError(null);
    } else {
      setMembers([]);
      setError(cachedError);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadMembers = async () => {
      const result = await fetchDiscordMembers();
      if (!isMounted) {
        return;
      }
      if (result) {
        setMembers(result);
        setError(null);
      } else {
        setMembers([]);
        setError(cachedError);
      }
      setLoading(false);
    };

    if (!cachedMembers && !cachedError) {
      void loadMembers();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return { members, loading, error, refresh };
}

