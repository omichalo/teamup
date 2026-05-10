"use client";

import { Typography } from "@mui/material";

export function CompositionsHeader() {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Composition des Équipes
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Composez les équipes pour une journée de championnat.
      </Typography>
    </>
  );
}
