"use client";

import { Chip, Stack, Typography } from "@mui/material";
import SportsTennisIcon from "@mui/icons-material/SportsTennis";
import Link from "next/link";
import type { MemberProfileCampItem } from "@/lib/member-profile/types";
import { MemberProfileSection } from "./MemberProfileSection";

type Props = {
  camps: MemberProfileCampItem[];
};

export function MemberCampsSection({ camps }: Props) {
  return (
    <MemberProfileSection
      title="Stages"
      subtitle={
        camps.length === 0
          ? "Aucune inscription stage liée à ce dossier."
          : `${camps.length} inscription(s) — résumé ; paiements dans Mes stages`
      }
      icon={SportsTennisIcon}
    >
      {camps.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Pour vous inscrire à un stage ouvert ou payer, ouvrez{" "}
          <Link href="/club/mes-stages">Mes stages</Link>.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {camps.map((camp) => (
            <Stack
              key={camp.id}
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1}
              sx={{
                py: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack spacing={0.25}>
                <Typography fontWeight={600}>
                  {camp.siteLabel} · {camp.formulaLabel || camp.formulaId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {camp.slotCount} créneau(x) · {(camp.totalCents / 100).toFixed(2)} €
                  {camp.invoiceNumber ? ` · ${camp.invoiceNumber}` : ""}
                </Typography>
              </Stack>
              <Chip size="small" label={camp.status} />
            </Stack>
          ))}
          <Typography variant="body2" color="text.secondary">
            Paiement et détail des créneaux :{" "}
            <Link href="/club/mes-stages">Mes stages</Link>.
          </Typography>
        </Stack>
      )}
    </MemberProfileSection>
  );
}
