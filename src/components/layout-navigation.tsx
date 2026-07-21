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
  Preview,
  RateReview,
  TableChart,
  TipsAndUpdates,
  Tune,
  VerifiedUser,
} from "@mui/icons-material";

export interface LayoutNavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export type LayoutNavGroupId = "championnat" | "adhesions";

export interface LayoutNavigationGroup {
  id: LayoutNavGroupId;
  label: string;
  items: LayoutNavigationItem[];
}

export interface LayoutNavigationStructure {
  primary: LayoutNavigationItem[];
  groups: LayoutNavigationGroup[];
}

const NAV = {
  accueil: { label: "Accueil", href: "/joueur", icon: <Home /> },
  nouvelleAdhesion: {
    label: "Nouvelle adhésion",
    href: "/club/inscription",
    icon: <HowToReg />,
  },
  mesDossiers: {
    label: "Mes dossiers",
    href: "/club/mes-inscriptions",
    icon: <FactCheck />,
  },
  dossiersAValider: {
    label: "Dossiers à valider",
    href: "/club/demandes-adhesion",
    icon: <RateReview />,
  },
  tableauAdhesions: {
    label: "Tableau des adhésions",
    href: "/club/adhesions-tableau",
    icon: <TableChart />,
  },
  boiteIdees: {
    label: "Idées & remontées",
    href: "/club/idees",
    icon: <TipsAndUpdates />,
  },
  campagnesTarifs: {
    label: "Campagnes & tarifs",
    href: "/club/parametrage-inscription",
    icon: <Tune />,
  },
  apercuFormulaire: {
    label: "Saisir une adhésion",
    href: "/club/inscription",
    icon: <Preview />,
  },
  joueurs: { label: "Joueurs", href: "/joueurs", icon: <Person /> },
  equipes: { label: "Équipes", href: "/equipes", icon: <Groups /> },
  disponibilites: {
    label: "Disponibilités",
    href: "/disponibilites",
    icon: <Event />,
  },
  compositions: {
    label: "Compositions",
    href: "/compositions",
    icon: <Assignment />,
  },
  modelesComposition: {
    label: "Modèles de composition",
    href: "/compositions/defaults",
    icon: <PlaylistAddCheck />,
  },
  administration: {
    label: "Administration",
    href: "/admin",
    icon: <AdminPanelSettings />,
  },
  validationsLicence: {
    label: "Licences & encaissements",
    href: "/club/validations-licence",
    icon: <VerifiedUser />,
  },
} as const satisfies Record<string, LayoutNavigationItem>;

export const LAYOUT_NAV = NAV;

type LayoutNavOptions = {
  hasUser: boolean;
  isAdmin: boolean;
  isPlayerLike: boolean;
  isAssistantSecretary: boolean;
  isSecretary: boolean;
};

export function hasLayoutNavigation(nav: LayoutNavigationStructure): boolean {
  return (
    nav.primary.length > 0 ||
    nav.groups.some((group) => group.items.length > 0)
  );
}

export function buildLayoutAccountMenuItems(
  options: LayoutNavOptions
): LayoutNavigationItem[] {
  const { hasUser, isAdmin, isPlayerLike, isSecretary } = options;
  if (!hasUser || isPlayerLike) {
    return [];
  }

  if (isAdmin) {
    return [NAV.mesDossiers];
  }

  if (isSecretary) {
    return [NAV.mesDossiers, NAV.nouvelleAdhesion];
  }

  return [NAV.mesDossiers, NAV.nouvelleAdhesion];
}

export function buildLayoutNavigation(
  options: LayoutNavOptions
): LayoutNavigationStructure {
  const { hasUser, isAdmin, isPlayerLike, isAssistantSecretary, isSecretary } =
    options;
  if (!hasUser) {
    return { primary: [], groups: [] };
  }

  if (isPlayerLike) {
    const primary: LayoutNavigationItem[] = [
      NAV.accueil,
      NAV.nouvelleAdhesion,
      NAV.mesDossiers,
    ];
    if (isAssistantSecretary) {
      primary.push(NAV.validationsLicence);
    }
    return { primary, groups: [] };
  }

  if (isSecretary) {
    return {
      primary: [NAV.dossiersAValider, NAV.boiteIdees],
      groups: [
        {
          id: "adhesions",
          label: "Adhésions",
          items: [
            NAV.tableauAdhesions,
            NAV.campagnesTarifs,
            NAV.apercuFormulaire,
            NAV.validationsLicence,
          ],
        },
      ],
    };
  }

  if (isAdmin) {
    return {
      primary: [
        NAV.dossiersAValider,
        NAV.compositions,
        NAV.boiteIdees,
        NAV.administration,
      ],
      groups: [
        {
          id: "championnat",
          label: "Championnat",
          items: [
            NAV.joueurs,
            NAV.equipes,
            NAV.disponibilites,
            NAV.modelesComposition,
          ],
        },
        {
          id: "adhesions",
          label: "Adhésions",
          items: [
            NAV.tableauAdhesions,
            NAV.campagnesTarifs,
            NAV.apercuFormulaire,
            NAV.validationsLicence,
          ],
        },
      ],
    };
  }

  return {
    primary: [NAV.compositions, NAV.disponibilites, NAV.boiteIdees],
    groups: [
      {
        id: "championnat",
        label: "Championnat",
        items: [NAV.joueurs, NAV.equipes, NAV.modelesComposition],
      },
    ],
  };
}
