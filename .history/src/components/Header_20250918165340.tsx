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
  SportsTennis as TennisIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function Header() {
  const { user, firebaseUser, signOut, isCoach } = useAuth();
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
      console.error("Erreur lors de la déconnexion:", error);
    }
    handleClose();
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    handleClose();
  };

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar>
        {/* Logo et titre */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            mr: 4,
          }}
          onClick={() => router.push("/")}
        >
          <TennisIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            SQY Ping
          </Typography>
        </Box>

        {/* Navigation principale */}
        <Box sx={{ flexGrow: 1, display: "flex", gap: 1 }}>
          <Button
            color="inherit"
            onClick={() => router.push("/equipes")}
            sx={{ textTransform: "none" }}
          >
            Équipes
          </Button>
          <Button
            color="inherit"
            onClick={() => router.push("/compositions")}
            sx={{ textTransform: "none" }}
          >
            Compositions
          </Button>
          <Button
            color="inherit"
            onClick={() => router.push("/disponibilites")}
            sx={{ textTransform: "none" }}
          >
            Disponibilités
          </Button>
          <Button
            color="inherit"
            onClick={() => router.push("/joueurs")}
            sx={{ textTransform: "none" }}
          >
            Joueurs
          </Button>
        </Box>

        {/* Menu utilisateur */}
        {user && firebaseUser ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Bouton Admin pour les coaches */}
            {isCoach && (
              <Button
                color="inherit"
                startIcon={<AdminIcon />}
                onClick={() => router.push("/admin")}
                sx={{ textTransform: "none" }}
              >
                Admin
              </Button>
            )}

            {/* Avatar et menu utilisateur */}
            <IconButton
              size="large"
              aria-label="compte utilisateur"
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
                {user.displayName?.charAt(0) || user.email?.charAt(0)}
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
              <MenuItem onClick={() => handleNavigation("/settings")}>
                <AccountIcon sx={{ mr: 1 }} />
                Mon profil
              </MenuItem>
              <MenuItem onClick={handleSignOut}>
                <LogoutIcon sx={{ mr: 1 }} />
                Déconnexion
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button
            color="inherit"
            onClick={() => router.push("/auth")}
            sx={{ textTransform: "none" }}
          >
            Connexion
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
