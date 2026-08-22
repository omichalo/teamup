"use client";

import { Chip, Stack, Tooltip } from "@mui/material";
import type { ChampionshipAlertCode } from "@/lib/championship/merge-players";
import type { Player } from "@/types/team-management";

const ALERT_LABELS: Record<ChampionshipAlertCode, { label: string; title: string }> = {
  unpaid: { label: "Non payé", title: "Dossier d'adhésion pas encore soldé" },
  payment_requested: {
    label: "Paiement demandé",
    title: "Paiement demandé, en attente d'encaissement",
  },
  not_in_club_list: {
    label: "Hors liste FFTT",
    title: "Licence absente de la liste club FFTT de la saison",
  },
  fftt_sqy_unlicensed: {
    label: "Licence saison",
    title: "Toujours affilié SQY à la FFTT, sans licence de saison",
  },
  other_club: { label: "Autre club", title: "Licence rattachée à un autre club FFTT" },
  other_federation: {
    label: "Autre fédé",
    title: "Licence d'une autre fédération",
  },
  no_license: { label: "Sans n°", title: "Pas de numéro de licence sur le dossier" },
};

type Props = {
  player: Player;
};

export function ChampionshipStatusChips({ player }: Props) {
  const alerts = player.championshipAlerts ?? [];
  if (alerts.length === 0) {
    return null;
  }
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap" component="span">
      {alerts.map((code) => {
        const meta = ALERT_LABELS[code];
        const label =
          code === "other_club" && player.nomClub?.trim()
            ? player.nomClub.trim()
            : meta.label;
        return (
          <Tooltip key={code} title={meta.title}>
            <Chip
              label={label}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.65rem" }}
            />
          </Tooltip>
        );
      })}
    </Stack>
  );
}
