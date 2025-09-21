"use client";

import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  SportsTennis as PingPongIcon,
  AccountCircle,
  Logout,
  Settings,
  Dashboard,
  Group,
  Event,
  Sports,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut, isCoach } = useAuth();

  // Pour l'instant, tous les utilisateurs connectés peuvent accéder à l'administration
  const isAdmin = !!user;
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
    handleClose();
  };

  const navigationItems = [
    { label: "Tableau de bord", href: "/", icon: <Dashboard /> },
    { label: "Équipes", href: "/equipes", icon: <Sports /> },
    { label: "Compositions", href: "/compositions", icon: <Group /> },
    { label: "Disponibilités", href: "/disponibilites", icon: <Event /> },
    ...(isCoach
      ? [{ label: "Paramètres", href: "/settings", icon: <Settings /> }]
      : []),
    ...(isAdmin
      ? [
          {
            label: "Administration",
            href: "/admin",
            icon: <AdminPanelSettings />,
          },
        ]
      : []),
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <PingPongIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SQY Ping - Team Up
          </Typography>

          {/* Navigation */}
          <Box sx={{ display: "flex", gap: 1, mr: 2 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.href}
                color="inherit"
                startIcon={item.icon}
                component={Link}
                href={item.href}
                sx={{ textTransform: "none" }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Dark mode toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={toggleDarkMode}
                size="small"
                sx={{ ml: 1 }}
              />
            }
            label=""
            sx={{ mr: 2 }}
          />

          {/* User menu */}
          {user ? (
            <>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar
                  src={user.photoURL}
                  alt={user.displayName}
                  sx={{ width: 32, height: 32 }}
                >
                  {user.displayName?.charAt(0)}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleClose}>
                  <AccountCircle sx={{ mr: 1 }} />
                  {user.displayName}
                </MenuItem>
                <MenuItem onClick={handleSignOut}>
                  <Logout sx={{ mr: 1 }} />
                  Déconnexion
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" onClick={() => router.push("/auth")}>
              Connexion
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
};
