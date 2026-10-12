"use client";

import { useEffect, useState } from "react";
import {
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CampMemberSearchHit } from "@/lib/camps/search-club-members";

type Props = {
  onPick: (member: CampMemberSearchHit) => void;
};

export function CampMemberSearchField({ onPick }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CampMemberSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ q: query.trim() });
          const res = await fetch(
            `/api/club/camps/members/search?${params.toString()}`,
            { credentials: "include" }
          );
          const json = (await res.json()) as {
            members?: CampMemberSearchHit[];
            error?: string;
          };
          if (cancelled) return;
          if (!res.ok) throw new Error(json.error ?? "Recherche impossible");
          setHits(json.members ?? []);
        } catch (err) {
          if (cancelled) return;
          setHits([]);
          setError(err instanceof Error ? err.message : "Erreur");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  return (
    <Stack spacing={1}>
      <TextField
        label="Rechercher un adhérent"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        fullWidth
        helperText="Nom ou prénom (2 caractères minimum)"
        autoComplete="off"
      />
      {loading ? <CircularProgress size={22} /> : null}
      {error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : null}
      {!loading && query.trim().length >= 2 && hits.length === 0 && !error ? (
        <Typography color="text.secondary" variant="body2">
          Aucun adhérent trouvé.
        </Typography>
      ) : null}
      {hits.length > 0 ? (
        <List dense disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
          {hits.map((hit) => (
            <ListItemButton
              key={hit.registrationId}
              onClick={() => {
                onPick(hit);
                setQuery("");
                setHits([]);
              }}
            >
              <ListItemText
                primary={hit.displayName}
                secondary={[hit.birthDate, hit.email, hit.phone]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </ListItemButton>
          ))}
        </List>
      ) : null}
    </Stack>
  );
}
