/** @see /api/openapi pour la spec JSON brute */
"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { Box, Typography } from "@mui/material";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SwaggerUI = dynamic<any>(() => import("swagger-ui-react"), {
  ssr: false,
});

export default function SwaggerPage() {
  return (
    <AuthGuard allowedRoles={[USER_ROLES.ADMIN]}>
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
            <SwaggerUI url="/api/openapi" docExpansion="none" />
          </Box>
        </Box>
    </AuthGuard>
  );
}


