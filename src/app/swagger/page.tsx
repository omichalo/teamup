/** @see /api/openapi pour la spec JSON brute */
"use client";

import { Box, Typography } from "@mui/material";
import { AuthGuard } from "@/components/AuthGuard";
import { SwaggerUiHost } from "@/components/swagger/SwaggerUiHost";
import { USER_ROLES } from "@/lib/auth/roles";

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
          <SwaggerUiHost url="/api/openapi" />
        </Box>
      </Box>
    </AuthGuard>
  );
}
