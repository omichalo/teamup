"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from "@/lib/analytics/consent";
import {
  initFirebaseAnalytics,
  resetFirebaseAnalyticsInstance,
} from "@/lib/analytics/firebase-analytics";

export function AnalyticsConsentBanner() {
  const [status, setStatus] = useState<AnalyticsConsentStatus>("unset");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => setStatus(readAnalyticsConsent());
    refresh();
    setHydrated(true);
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, refresh);
    };
  }, []);

  if (!hydrated || status !== "unset") {
    return null;
  }

  const accept = () => {
    writeAnalyticsConsent("granted");
    void initFirebaseAnalytics();
  };

  const refuse = () => {
    resetFirebaseAnalyticsInstance();
    writeAnalyticsConsent("denied");
  };

  return (
    <Paper
      id="analytics-consent-banner"
      component="aside"
      elevation={8}
      role="dialog"
      aria-labelledby="analytics-consent-title"
      aria-describedby="analytics-consent-desc"
      sx={{
        position: "fixed",
        zIndex: (theme) => theme.zIndex.tooltip + 1,
        left: { xs: 12, sm: 24 },
        right: { xs: 12, sm: 24 },
        bottom: { xs: 12, sm: 24 },
        maxWidth: 560,
        ml: { sm: "auto" },
        p: 2.5,
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography id="analytics-consent-title" variant="subtitle1" fontWeight={700}>
            Mesure d’audience
          </Typography>
          <Typography id="analytics-consent-desc" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Nous utilisons Google Analytics (Firebase) pour comprendre l’utilisation de
            TeamUp. Aucune mesure n’est activée sans votre accord.{" "}
            <Link href="/confidentialite">En savoir plus</Link>
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
          <Button variant="outlined" color="inherit" onClick={refuse}>
            Refuser
          </Button>
          <Button variant="contained" color="primary" onClick={accept}>
            Accepter
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
