"use client";

import React, { useState, useEffect } from "react";
import { isServer } from "../utils/environment";
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  useTheme,
  IconButton,
} from "@mui/material";
import {
  Palette as PaletteIcon,
  Widgets as WidgetsIcon,
  Description as DescriptionIcon,
  Navigation as NavigationIcon,
  Feedback as FeedbackIcon,
  ViewList as ViewListIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from "@mui/icons-material";
// Note: Image component should be provided by the consuming application
import { useColorMode } from "../providers/AppThemeProvider";

const DRAWER_WIDTH = 280;

interface StoryPage {
  title: string;
  path: string;
  icon: React.ReactElement;
  description: string;
}

export function StoryLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { mode, toggleColorMode } = useColorMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!canUseHooks) return;
    setMounted(true);
  }, []);

  const storyPages: StoryPage[] = [
    {
      title: "Theme Showcase",
      path: "/stories/theme-showcase",
      icon: <PaletteIcon />,
      description: "Palette de couleurs et typographies",
    },
    {
      title: "Buttons & Chips",
      path: "/stories/buttons-chips",
      icon: <WidgetsIcon />,
      description: "Boutons, chips et badges",
    },
    {
      title: "Forms",
      path: "/stories/forms",
      icon: <DescriptionIcon />,
      description: "Formulaires et contrôles",
    },
    {
      title: "Navigation",
      path: "/stories/navigation",
      icon: <NavigationIcon />,
      description: "Navigation et menus",
    },
    {
      title: "Feedback",
      path: "/stories/feedback",
      icon: <FeedbackIcon />,
      description: "Alertes et notifications",
    },
    {
      title: "Cards & Lists",
      path: "/stories/cards-lists",
      icon: <ViewListIcon />,
      description: "Cards et listes",
    },
    {
      title: "Complex Dashboard",
      path: "/stories/complex-dashboard",
      icon: <DashboardIcon />,
      description: "Tableau de bord complet",
    },
    {
      title: "Complex Form Page",
      path: "/stories/complex-form-page",
      icon: <AssignmentIcon />,
      description: "Formulaire multi-étapes",
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            component="img"
            src="/images/sqying.png"
            alt="SQY PING"
            sx={{
              width: 40,
              height: 40,
              filter: mode === "dark" ? "invert(1)" : "none",
            }}
          />
          <Typography variant="h6" noWrap component="div">
            SQY PING
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {storyPages.map((page) => (
          <ListItem key={page.path} disablePadding>
            <ListItemButton
              href={page.path}
              sx={{
                "&:hover": {
                  backgroundColor: theme.palette.primary.main + "08",
                },
              }}
            >
              <ListItemIcon sx={{ color: "primary.main" }}>
                {page.icon}
              </ListItemIcon>
              <ListItemText
                primary={page.title}
                secondary={page.description}
                primaryTypographyProps={{
                  variant: "body2",
                  fontWeight: 500,
                }}
                secondaryTypographyProps={{
                  variant: "caption",
                  color: "text.secondary",
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ mx: 2 }} />

      <Box sx={{ p: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={mode === "dark"}
              onChange={toggleColorMode}
              sx={{
                "& .MuiSwitch-thumb": {
                  backgroundColor: mode === "dark" ? "#fff" : "#ffa726",
                },
                "& .MuiSwitch-track": {
                  backgroundColor: mode === "dark" ? "#1976d2" : "#ffcc02",
                  opacity: 1,
                },
              }}
            />
          }
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {mode === "dark" ? (
                <DarkModeIcon
                  fontSize="small"
                  sx={{ color: "primary.contrastText" }}
                />
              ) : (
                <LightModeIcon
                  fontSize="small"
                  sx={{ color: "warning.dark" }}
                />
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: "text.primary",
                }}
              >
                {mode === "dark" ? "Mode sombre" : "Mode clair"}
              </Typography>
            </Box>
          }
        />
      </Box>
    </Box>
  );

  // Si on est côté serveur ou qu'on ne peut pas utiliser les hooks
  if (isServer || !canUseHooks) {
    return (
      <div suppressHydrationWarning>
        <div style={{ padding: "20px" }}>
          <h1>SQY PING Theme Stories</h1>
          {children}
        </div>
      </div>
    );
  }

  // Si on n'est pas encore monté côté client
  if (!mounted) {
    return (
      <div suppressHydrationWarning>
        <div style={{ padding: "20px" }}>
          <h1>SQY PING Theme Stories</h1>
          {children}
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "primary.main",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <PaletteIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            SQY PING Theme Stories
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flexGrow: 1 }}>
        <Box
          component="nav"
          sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: "block", md: "none" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: DRAWER_WIDTH,
              },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: "none", md: "block" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: DRAWER_WIDTH,
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
