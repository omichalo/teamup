"use client";

import { Box, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 2,
      }}
    >
      <Typography variant="h1">404</Typography>
      <Typography variant="h5">Page non trouvée</Typography>
      <Button variant="contained" onClick={() => router.push("/")}>
        Retour à l&apos;accueil
      </Button>
    </Box>
  );
}

