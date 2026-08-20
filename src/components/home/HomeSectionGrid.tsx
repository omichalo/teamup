"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import type { PaletteColor } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type {
  HomeDashboardSection,
  HomeLinkCard,
} from "@/lib/navigation/home-content";

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
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: 3,
          borderColor: (theme) =>
            alpha((theme.palette[link.color] as PaletteColor).main, 0.5),
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: (theme) =>
                alpha((theme.palette[link.color] as PaletteColor).main, 0.14),
              color: (theme) => (theme.palette[link.color] as PaletteColor).main,
              "& .MuiSvgIcon-root": { fontSize: 22 },
            }}
          >
            {link.icon}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {link.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {link.description}
          </Typography>
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
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

export function HomeSectionGrid({
  sections,
}: {
  sections: HomeDashboardSection[];
}) {
  return (
    <Box>
      <Typography
        variant="h5"
        component="h2"
        sx={{ fontWeight: 700, color: "primary.main", mb: 0.75 }}
      >
        Vos espaces
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
        Tout ce que vous pouvez ouvrir avec votre rôle, regroupé par thème.
      </Typography>
      {sections.map((section) => (
        <Box component="section" key={section.id} sx={{ mb: 4 }}>
          <Typography
            variant="overline"
            sx={{
              display: "block",
              color: "secondary.dark",
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {section.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {section.description}
          </Typography>
          <Grid container spacing={2}>
            {section.items.map((link) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={`${section.id}:${link.href}`}>
                <HomeLinkCardView link={link} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
