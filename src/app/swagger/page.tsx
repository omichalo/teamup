"use client";

import { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";

export default function SwaggerPage() {
  const uiRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!uiRef.current) return;

    // Ajouter la feuille de style Swagger UI si elle n'est pas déjà présente
    const existingCss = document.getElementById("swagger-ui-css");
    if (!existingCss) {
      const link = document.createElement("link");
      link.id = "swagger-ui-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
      document.head.appendChild(link);
    }

    const initSwagger = () => {
      if (typeof window === "undefined" || !window.SwaggerUIBundle || !uiRef.current) {
        return;
      }
      window.SwaggerUIBundle({
        url: "/api/openapi",
        domNode: uiRef.current,
        presets: [window.SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
      });
    };

    // Charger le script Swagger UI s'il n'est pas déjà présent
    const existingScript = document.getElementById("swagger-ui-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "swagger-ui-script";
      script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
      script.onload = initSwagger;
      document.body.appendChild(script);
    } else {
      initSwagger();
    }
  }, []);

  return (
    <AuthGuard allowedRoles={[USER_ROLES.ADMIN]}>
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Documentation API (Swagger)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cette page est accessible uniquement aux administrateurs. Elle expose la spécification
            OpenAPI de toutes les routes HTTP de l&apos;application.
          </Typography>
          <Box
            sx={{
              mt: 2,
              borderRadius: 2,
              overflow: "hidden",
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <div ref={uiRef} />
          </Box>
        </Box>
      </Layout>
    </AuthGuard>
  );
}


