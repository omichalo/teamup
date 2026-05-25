"use client";

import type React from "react";
import {
  AdminPanelSettings,
  Assignment,
  Event,
  FactCheck,
  Groups,
  Home,
  HowToReg,
  Person,
  PlaylistAddCheck,
  RateReview,
  Tune,
} from "@mui/icons-material";

export interface LayoutNavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const PARAMETRAGE_INSCRIPTION_NAV: LayoutNavigationItem = {
  label: "Paramétrage inscription",
  href: "/club/parametrage-inscription",
  icon: <Tune />,
};

export function buildLayoutNavigationItems(options: {
  hasUser: boolean;
  isAdmin: boolean;
  isPlayer: boolean;
  isSecretary: boolean;
}): LayoutNavigationItem[] {
  const { hasUser, isAdmin, isPlayer, isSecretary } = options;
  if (!hasUser) return [];

  if (isPlayer) {
    return [
      { label: "Accueil joueur", href: "/joueur", icon: <Home /> },
      { label: "Inscription club", href: "/club/inscription", icon: <HowToReg /> },
      { label: "Mes inscriptions", href: "/club/mes-inscriptions", icon: <FactCheck /> },
    ];
  }

  if (isSecretary) {
    return [
      { label: "Demandes d’adhésion", href: "/club/demandes-adhesion", icon: <RateReview /> },
      PARAMETRAGE_INSCRIPTION_NAV,
      { label: "Inscription club", href: "/club/inscription", icon: <HowToReg /> },
      { label: "Mes inscriptions", href: "/club/mes-inscriptions", icon: <FactCheck /> },
    ];
  }

  const items: LayoutNavigationItem[] = [
    { label: "Inscription club", href: "/club/inscription", icon: <HowToReg /> },
    { label: "Mes inscriptions", href: "/club/mes-inscriptions", icon: <FactCheck /> },
    { label: "Joueurs", href: "/joueurs", icon: <Person /> },
    { label: "Équipes", href: "/equipes", icon: <Groups /> },
    { label: "Disponibilités", href: "/disponibilites", icon: <Event /> },
    { label: "Compositions", href: "/compositions", icon: <Assignment /> },
    { label: "Compo. par défaut", href: "/compositions/defaults", icon: <PlaylistAddCheck /> },
  ];

  if (isAdmin) {
    items.push(
      { label: "Demandes d’adhésion", href: "/club/demandes-adhesion", icon: <RateReview /> },
      PARAMETRAGE_INSCRIPTION_NAV,
      { label: "Admin", href: "/admin", icon: <AdminPanelSettings /> }
    );
  }

  return items;
}
