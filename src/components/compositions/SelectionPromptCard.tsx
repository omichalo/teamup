"use client";

import { Card, CardContent, Typography } from "@mui/material";

export function SelectionPromptCard() {
  return (
    <Card>
      <CardContent>
        <Typography variant="body1" color="text.secondary" align="center">
          Veuillez sélectionner une phase et une journée pour commencer
        </Typography>
      </CardContent>
    </Card>
  );
}
