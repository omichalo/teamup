"use client";

import React from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { SportsTennis as PingPongIcon } from "@mui/icons-material";

export default function TestPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Test SQY Ping
      </Typography>
      
      <Card sx={{ mb: 3, bgcolor: "primary.main", color: "white" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <PingPongIcon sx={{ mr: 1, fontSize: 32 }} />
            <Box>
              <Typography variant="h5" component="h2">
                SQY PING
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Gymnase des Pyramides • Voisins-le-Bretonneux
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Coordinateur: Joffrey NIZAN • 26 équipes actives
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="body1">
        ✅ Application SQY Ping Team Up fonctionnelle avec les vraies données FFTT !
      </Typography>
    </Box>
  );
}
