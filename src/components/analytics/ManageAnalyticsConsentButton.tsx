"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  clearAnalyticsConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from "@/lib/analytics/consent";
import {
  initFirebaseAnalytics,
  resetFirebaseAnalyticsInstance,
} from "@/lib/analytics/firebase-analytics";

type ManageAnalyticsConsentButtonProps = {
  label?: string;
};

function statusLabel(status: AnalyticsConsentStatus): string {
  if (status === "granted") return "Mesure d’audience acceptée";
  if (status === "denied") return "Mesure d’audience refusée";
  return "Aucun choix enregistré — le bandeau peut aussi s’afficher en bas de l’écran";
}

/**
 * Permet de revoir le choix analytics : efface la préférence, affiche
 * Accepter / Refuser sur place (et réaffiche le bandeau global).
 */
export function ManageAnalyticsConsentButton({
  label = "Gérer les cookies de mesure d’audience",
}: ManageAnalyticsConsentButtonProps) {
  const [status, setStatus] = useState<AnalyticsConsentStatus>("unset");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const refresh = () => setStatus(readAnalyticsConsent());
    refresh();
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, refresh);
    };
  }, []);

  const startEditing = () => {
    resetFirebaseAnalyticsInstance();
    clearAnalyticsConsent();
    setEditing(true);
    // Laisse le bandeau global se monter, puis le met en évidence.
    requestAnimationFrame(() => {
      document.getElementById("analytics-consent-banner")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  const accept = () => {
    writeAnalyticsConsent("granted");
    void initFirebaseAnalytics();
    setEditing(false);
  };

  const refuse = () => {
    resetFirebaseAnalyticsInstance();
    writeAnalyticsConsent("denied");
    setEditing(false);
  };

  return (
    <Stack spacing={1.5} alignItems="flex-start">
      <Typography variant="body2" color="text.secondary">
        État actuel : {statusLabel(status)}
      </Typography>

      {!editing ? (
        <Button variant="outlined" onClick={startEditing}>
          {label}
        </Button>
      ) : (
        <Alert severity="info" sx={{ width: "100%" }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Choisissez si vous autorisez la mesure d’audience (Google Analytics /
            Firebase). Aucune mesure n’est active tant que vous n’avez pas accepté.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="outlined" color="inherit" onClick={refuse}>
              Refuser
            </Button>
            <Button variant="contained" color="primary" onClick={accept}>
              Accepter
            </Button>
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
