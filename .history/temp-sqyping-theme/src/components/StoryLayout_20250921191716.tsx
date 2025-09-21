import React, { useState, useEffect } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { isServer } from "../utils/environment";

interface StoryPage {
  title: string;
  path: string;
}

interface StoryLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const StoryLayout: React.FC<StoryLayoutProps> = ({
  children,
  title = "SQY PING Theme Stories",
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const storyPages: StoryPage[] = [
    { title: "Accueil", path: "/" },
    { title: "Couleurs", path: "/colors" },
    { title: "Typographie", path: "/typography" },
    { title: "Composants", path: "/components" },
    { title: "Formulaires", path: "/forms" },
  ];

  // Si on est côté serveur
  if (isServer) {
    return (
      <div suppressHydrationWarning>
        <div style={{ padding: "20px" }}>
          <h1>{title}</h1>
          {children}
        </div>
      </div>
    );
  }

  // Si pas encore monté côté client
  if (!mounted) {
    return (
      <div suppressHydrationWarning>
        <div style={{ padding: "20px" }}>
          <h1>{title}</h1>
          {children}
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          px: 3,
          py: 2,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {storyPages.map((page) => (
            <Button
              key={page.path}
              variant="outlined"
              size="small"
              href={page.path}
              sx={{ textTransform: "none" }}
            >
              {page.title}
            </Button>
          ))}
        </Stack>
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Box>
  );
};