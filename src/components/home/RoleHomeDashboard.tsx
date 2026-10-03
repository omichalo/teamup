"use client";

import { Box } from "@mui/material";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { buildRoleHomeContent } from "@/lib/navigation/home-content";
import { HomeHeroBanner } from "@/components/home/HomeHeroBanner";
import { HomeSectionGrid } from "@/components/home/HomeSectionGrid";

export function RoleHomeDashboard() {
  const { user } = useAuth();
  const content = useMemo(
    () => (user ? buildRoleHomeContent(user.role) : null),
    [user]
  );

  if (!content) {
    return null;
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4 } }}>
      <HomeHeroBanner
        eyebrow={content.eyebrow}
        title={content.title}
        subtitle={content.subtitle}
      />
      <HomeSectionGrid sections={content.sections} />
    </Box>
  );
}
