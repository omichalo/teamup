"use client";

import type { ReactNode } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import type { PaletteColor } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  buildCoachAdminHomeContent,
  type HomeLinkCard,
  type HomeDashboardSection,
} from "@/lib/navigation/coach-admin-home-content";
import type { LayoutNavigationItem } from "@/components/layout-navigation";

function HomeLinkCardView({ link }: { link: HomeLinkCard }) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
          borderColor: (theme) =>
            alpha((theme.palette[link.color] as PaletteColor).main, 0.5),
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: (theme) =>
                alpha((theme.palette[link.color] as PaletteColor).main, 0.15),
              color: (theme) => (theme.palette[link.color] as PaletteColor).main,
              "& .MuiSvgIcon-root": { fontSize: 24 },
            }}
          >
            {link.icon}
          </Box>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {link.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {link.description}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          color={link.color}
          component={Link}
          href={link.href}
        >
          {link.cta}
        </Button>
      </CardActions>
    </Card>
  );
}

function HomeSection({ section }: { section: HomeDashboardSection }) {
  const isAccount = section.id === "account";
  const isSingleCard = section.items.length === 1;

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Typography
        variant="overline"
        sx={{
          display: "block",
          mb: 2,
          color: "text.secondary",
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        {section.title}
      </Typography>
      <Grid container spacing={2}>
        {section.items.map((link) => (
          <Grid
            item
            xs={12}
            sm={isSingleCard ? 12 : 6}
            md={isAccount ? 6 : isSingleCard ? 6 : 4}
            lg={isAccount ? 4 : isSingleCard ? 4 : 3}
            key={link.href}
          >
            <HomeLinkCardView link={link} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function HeroCtaButton({
  item,
  variant,
  isFirst,
  onNavigate,
}: {
  item: LayoutNavigationItem;
  variant: "contained" | "outlined";
  isFirst: boolean;
  onNavigate: (href: string) => void;
}) {
  const outlinedSx = {
    borderColor: alpha("#ffffff", 0.5),
    color: "common.white",
    "&:hover": {
      borderColor: "common.white",
      backgroundColor: alpha("#ffffff", 0.12),
    },
  };

  return (
    <Button
      variant={variant}
      color={isFirst ? "secondary" : "inherit"}
      startIcon={item.icon as ReactNode}
      onClick={() => onNavigate(item.href)}
      sx={variant === "outlined" ? outlinedSx : { fontWeight: 600 }}
    >
      {item.label}
    </Button>
  );
}

export function CoachAdminHomeDashboard() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const content = useMemo(
    () => buildCoachAdminHomeContent(isAdmin),
    [isAdmin]
  );

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4 } }}>
      <Box
        component="header"
        sx={{
          borderRadius: 3,
          mb: 5,
          p: { xs: 3, sm: 4 },
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #1d2b64 0%, #1e4875 100%)"
              : "linear-gradient(135deg, #22418f 0%, #4979f2 100%)",
          color: "common.white",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 18px 32px rgba(29, 43, 100, 0.55)"
              : "0 20px 40px rgba(73, 121, 242, 0.35)",
        }}
      >
        <Stack spacing={3}>
          <Chip
            label="Accueil"
            sx={{
              width: "fit-content",
              backgroundColor: alpha("#ffffff", 0.18),
              color: "common.white",
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            SQY Ping TeamUp
          </Typography>
          <Typography
            variant="body1"
            sx={{ maxWidth: 640, opacity: 0.92, lineHeight: 1.6 }}
          >
            {content.heroSubtitle}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            useFlexGap
            flexWrap="wrap"
          >
            {content.heroCtas.map((item, index) => (
              <HeroCtaButton
                key={item.href}
                item={item}
                variant={index === 0 ? "contained" : "outlined"}
                isFirst={index === 0}
                onNavigate={(href) => router.push(href)}
              />
            ))}
          </Stack>
        </Stack>
      </Box>

      {content.sections.map((section) => (
        <HomeSection key={section.id} section={section} />
      ))}
    </Box>
  );
}
