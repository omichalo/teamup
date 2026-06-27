"use client";

import type { ReactNode } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import RateReviewIcon from "@mui/icons-material/RateReview";
import Link from "next/link";
import { buildManagedTreatQueueHref } from "@/lib/club-registration/managed-queue-summary";

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
      <SpreadsheetOpenInQueueButton registrationId={registrationId} />
    </Box>
  );
}
