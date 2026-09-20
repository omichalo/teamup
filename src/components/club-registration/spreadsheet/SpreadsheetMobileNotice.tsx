"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import RateReviewIcon from "@mui/icons-material/RateReview";

type Props = {
  queueHref: string;
  showQueueLink: boolean;
};

/**
 * Rappel que le VirtualGrid est pensé desktop ; oriente vers la file mobile.
 * Affiché uniquement sous `md`.
 */
export function SpreadsheetMobileNotice({ queueHref, showQueueLink }: Props) {
  return (
    <Alert
      severity="info"
      sx={{ display: { xs: "flex", md: "none" } }}
      {...(showQueueLink
        ? {
            action: (
              <Button
                component={Link}
                href={queueHref}
                color="inherit"
                size="small"
                startIcon={<RateReviewIcon />}
                sx={{ whiteSpace: "nowrap" }}
              >
                File d&apos;attente
              </Button>
            ),
          }
        : {})}
    >
      Vue optimale sur grand écran (≥ 900&nbsp;px). Sur mobile, préférez la file
      d&apos;attente pour traiter les dossiers.
    </Alert>
  );
}
