"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditNoteIcon from "@mui/icons-material/EditNote";
import Link from "next/link";
import type { MemberProfileResponse } from "@/lib/member-profile/types";
import { buildTreatDossierHref } from "@/lib/member-profile/urls";
import { MemberProfileHeader } from "./MemberProfileHeader";
import { MemberSlotsSection } from "./MemberSlotsSection";
import { MemberAttendanceSection } from "./MemberAttendanceSection";
import { MemberFinanceSection } from "./MemberFinanceSection";

type Props = {
  registrationId: string;
};

function MemberProfileSkeleton() {
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between">
        <Skeleton variant="rounded" width={96} height={36} />
        <Skeleton variant="rounded" width={160} height={36} />
      </Stack>
      <Skeleton variant="rounded" height={210} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
    </Stack>
  );
}

export function MemberProfileClient({ registrationId }: Props) {
  const [profile, setProfile] = useState<MemberProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/club/adherents/${encodeURIComponent(registrationId)}/profile`,
        { credentials: "include" }
      );
      const json = (await res.json().catch(() => null)) as
        | MemberProfileResponse
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(
          json && "error" in json && json.error
            ? json.error
            : "Impossible de charger la fiche."
        );
      }
      setProfile(json as MemberProfileResponse);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [registrationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <MemberProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <Stack spacing={2}>
        <Button
          component={Link}
          href="/club/mes-inscriptions"
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: "flex-start" }}
        >
          Retour
        </Button>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void load()}>
              Réessayer
            </Button>
          }
        >
          {error ?? "Fiche introuvable"}
        </Alert>
      </Stack>
    );
  }

  const backHref = profile.viewer.isOwner
    ? "/club/mes-inscriptions"
    : "/club/adhesions-tableau";

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1.25}
      >
        <Button
          component={Link}
          href={backHref}
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          Retour
        </Button>
        {profile.viewer.canManage ? (
          <Button
            component={Link}
            href={buildTreatDossierHref(registrationId)}
            variant="contained"
            color="secondary"
            startIcon={<EditNoteIcon />}
          >
            Traiter le dossier
          </Button>
        ) : null}
      </Stack>

      <MemberProfileHeader profile={profile} />

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1fr) minmax(0, 1.15fr)",
          },
          alignItems: "start",
        }}
      >
        <Stack spacing={2.5}>
          <MemberSlotsSection slots={profile.slots} />
          <MemberAttendanceSection attendance={profile.attendance} />
        </Stack>
        <MemberFinanceSection
          finance={profile.finance}
          documents={profile.documents}
          registrationId={registrationId}
        />
      </Box>

      {!profile.viewer.canManage ? (
        <Alert severity="info" variant="outlined">
          <Typography variant="body2">
            Vue en lecture seule. Pour payer ou télécharger vos justificatifs, utilisez
            également{" "}
            <Box
              component={Link}
              href="/club/mes-inscriptions"
              sx={{ color: "primary.main", fontWeight: 700 }}
            >
              Mes dossiers
            </Box>
            .
          </Typography>
        </Alert>
      ) : null}
    </Stack>
  );
}
