"use client";

import Image from "next/image";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  HOME_HERO_IMAGE_ALT,
  HOME_HERO_IMAGE_SRC,
} from "@/lib/navigation/home-content";

type HomeHeroBannerProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function HomeHeroBanner({
  eyebrow,
  title,
  subtitle,
}: HomeHeroBannerProps) {
  return (
    <Box
      component="header"
      sx={{
        position: "relative",
        borderRadius: 3,
        overflow: "hidden",
        minHeight: { xs: 240, sm: 280, md: 320 },
        mb: 4,
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 18px 32px rgba(26, 33, 71, 0.55)"
            : "0 16px 36px rgba(40, 48, 109, 0.22)",
      }}
    >
      <Image
        src={HOME_HERO_IMAGE_SRC}
        alt={HOME_HERO_IMAGE_ALT}
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center 30%" }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(26, 33, 71, 0.92) 0%, rgba(26, 33, 71, 0.72) 42%, rgba(26, 33, 71, 0.28) 100%)",
        }}
      />
      <Stack
        spacing={1.5}
        sx={{
          position: "relative",
          zIndex: 1,
          p: { xs: 3, sm: 4 },
          maxWidth: 640,
          color: "common.white",
          minHeight: { xs: 240, sm: 280, md: 320 },
          justifyContent: "flex-end",
        }}
      >
        <Chip
          label={eyebrow}
          sx={{
            width: "fit-content",
            backgroundColor: alpha("#ffffff", 0.18),
            color: "common.white",
            fontWeight: 600,
            letterSpacing: 0.4,
          }}
        />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
          {title}
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.92, lineHeight: 1.6 }}>
          {subtitle}
        </Typography>
      </Stack>
    </Box>
  );
}
