"use client";

import type { ReactNode } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import RateReviewIcon from "@mui/icons-material/RateReview";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import Link from "next/link";
import { buildManagedTreatQueueHref } from "@/lib/club-registration/managed-queue-summary";
import { buildMemberProfileHref } from "@/lib/member-profile/urls";

type Props = {
  registrationId: string;
};

export function SpreadsheetOpenInQueueButton({ registrationId }: Props) {
  const href = buildManagedTreatQueueHref(registrationId);

  return (
    <Tooltip title="Ouvrir dans la file de traitement">
      <IconButton
        component={Link}
        href={href}
        size="small"
        aria-label="Ouvrir dans la file de traitement"
        onClick={(event) => event.stopPropagation()}
        sx={{ ml: 0.5, flexShrink: 0 }}
      >
        <RateReviewIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  );
}

export function SpreadsheetOpenProfileButton({ registrationId }: Props) {
  const href = buildMemberProfileHref(registrationId);

  return (
    <Tooltip title="Voir la fiche adhérent">
      <IconButton
        component={Link}
        href={href}
        size="small"
        aria-label="Voir la fiche adhérent"
        onClick={(event) => event.stopPropagation()}
        sx={{ ml: 0.25, flexShrink: 0 }}
      >
        <PersonSearchIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  );
}

export function SpreadsheetFirstCellContent({
  registrationId,
  children,
}: {
  registrationId: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
        {children}
      </Box>
      <SpreadsheetOpenProfileButton registrationId={registrationId} />
      <SpreadsheetOpenInQueueButton registrationId={registrationId} />
    </Box>
  );
}
