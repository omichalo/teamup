"use client";

import { useId, useState } from "react";
import {
  Alert,
  Button,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
} from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import { downloadSpreadsheetCsv } from "@/lib/club-registration/spreadsheet/export-csv";
import {
  buildMailingListCsv,
  buildMailingListExportFilename,
  collectMailingListEmails,
  countRegistrationsWithoutMailingEmail,
  formatMailingListForClipboard,
} from "@/lib/club-registration/spreadsheet/export-mailing-list";

type Feedback = {
  severity: "success" | "warning" | "error";
  message: string;
};

type Props = {
  rows: RegistrationClientRecord[];
  disabled: boolean;
};

export function SpreadsheetMailingListMenu({ rows, disabled }: Props) {
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const menuOpen = Boolean(anchorEl);

  const closeMenu = () => setAnchorEl(null);

  const handleCopy = async () => {
    closeMenu();
    const emails = collectMailingListEmails(rows);
    if (emails.length === 0) {
      setFeedback({
        severity: "warning",
        message: "Aucun e-mail de contact dans la sélection filtrée.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(formatMailingListForClipboard(emails));
      const withoutEmail = countRegistrationsWithoutMailingEmail(rows);
      const withoutSuffix =
        withoutEmail > 0
          ? ` (${withoutEmail} dossier${withoutEmail > 1 ? "s" : ""} sans e-mail)`
          : "";
      setFeedback({
        severity: "success",
        message: `${emails.length} adresse${emails.length > 1 ? "s" : ""} copiée${emails.length > 1 ? "s" : ""}${withoutSuffix}`,
      });
    } catch {
      setFeedback({
        severity: "error",
        message: "Impossible de copier dans le presse-papiers.",
      });
    }
  };

  const handleDownload = () => {
    closeMenu();
    const emails = collectMailingListEmails(rows);
    if (emails.length === 0) {
      setFeedback({
        severity: "warning",
        message: "Aucun e-mail de contact dans la sélection filtrée.",
      });
      return;
    }
    downloadSpreadsheetCsv(buildMailingListExportFilename(), buildMailingListCsv(rows));
    setFeedback({
      severity: "success",
      message: `CSV téléchargé · ${emails.length} adresse${emails.length > 1 ? "s" : ""}`,
    });
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<MailOutlineIcon />}
        disabled={disabled}
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup="true"
        aria-expanded={menuOpen ? "true" : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        Liste de diffusion
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => void handleCopy()}>
          <ListItemText primary="Copier les e-mails" secondary="Séparés par ; pour CCI" />
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <ListItemText primary="Télécharger le CSV" secondary="Email, nom, type de contact" />
        </MenuItem>
      </Menu>
      {feedback ? (
        <Snackbar
          open
          autoHideDuration={feedback.severity === "success" ? 4000 : 8000}
          onClose={() => setFeedback(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity={feedback.severity}
            variant="filled"
            onClose={() => setFeedback(null)}
          >
            {feedback.message}
          </Alert>
        </Snackbar>
      ) : null}
    </>
  );
}
