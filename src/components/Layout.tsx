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
} from "@mui/material";
import {
  AccountCircle,
  Logout,
  Settings,
  Event,
  AdminPanelSettings,
  Person,
  Groups,
  Assignment,
  PlaylistAddCheck,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut, isCoach } = useAuth();

  const isAdmin = !!user;
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
      router.push("/auth");
    } catch (error) {
      console.error("Sign out error:", error);
    }
    handleClose();
  };

  const navigationItems = [
    { label: "Joueurs", href: "/joueurs", icon: <Person /> },
    { label: "Équipes", href: "/equipes", icon: <Groups /> },
    { label: "Disponibilités", href: "/disponibilites", icon: <Event /> },
    { label: "Compositions", href: "/compositions", icon: <Assignment /> },
    {
      label: "Compo. par défaut",
      href: "/compositions/defaults",
      icon: <PlaylistAddCheck />,
    },
    ...(isAdmin
      ? [
          {
            label: "Admin",
            href: "/admin",
            icon: <AdminPanelSettings />,
          },
        ]
      : []),
    ...(isCoach
      ? [{ label: "Paramètres", href: "/settings", icon: <Settings /> }]
      : []),
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
          <Box
            component={Link}
            href="/"
            sx={{
              display: "flex",
              alignItems: "center",
              color: "inherit",
              textDecoration: "none",
              flexGrow: 1,
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                overflow: "hidden",
                px: 0.5,
                py: 0.5,
              }}
            >
              <Image
                src="/icon.png"
                alt="SQY Ping"
                width={40}
                height={40}
                priority
              />
            </Box>
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 600,
                letterSpacing: 0.5,
                whiteSpace: "nowrap",
              }}
            >
              Team Up
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.href}
                color="inherit"
                startIcon={item.icon}
                component={Link}
                href={item.href}
                sx={{
                  textTransform: "none",
                  px: 1,
                  minWidth: "auto",
                  "& .MuiButton-startIcon": {
                    marginRight: 0.5,
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

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
                  {...(user.photoURL && { src: user.photoURL })}
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

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
};
