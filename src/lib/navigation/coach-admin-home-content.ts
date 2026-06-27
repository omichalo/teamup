import type { LayoutNavigationItem } from "@/components/layout-navigation";
import { LAYOUT_NAV } from "@/components/layout-navigation";

export type HomeLinkColor =
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "warning";

export type HomeLinkCard = LayoutNavigationItem & {
  description: string;
  cta: string;
  color: HomeLinkColor;
};

export type HomeDashboardSection = {
  id: "championnat" | "adhesions" | "ideas" | "account";
  title: string;
  items: HomeLinkCard[];
};

const HOME_LINK_META: Record<
  string,
  { description: string; cta: string; color: HomeLinkColor }
> = {
  "/joueurs": {
    description: "Gérer les joueurs, participations et équipes préférées",
    cta: "Gérer les joueurs",
    color: "primary",
  },
  "/equipes": {
    description: "Consulter les équipes, résultats et classements",
    cta: "Voir les équipes",
    color: "secondary",
  },
  "/disponibilites": {
    description: "Saisir les disponibilités par journée et suivre les réponses",
    cta: "Gérer les disponibilités",
    color: "info",
  },
  "/compositions": {
    description: "Composer les équipes en respectant les règles de brûlage",
    cta: "Composer les équipes",
    color: "warning",
  },
  "/compositions/defaults": {
    description: "Définir la base de chaque équipe en début de phase",
    cta: "Configurer les modèles",
    color: "success",
  },
  "/club/demandes-adhesion": {
    description: "Traiter les dossiers soumis et suivre les paiements",
    cta: "Ouvrir les dossiers",
    color: "secondary",
  },
  "/club/adhesions-tableau": {
    description: "Vue d'ensemble de tous les dossiers avec tri et filtres par colonne",
    cta: "Ouvrir le tableau",
    color: "info",
  },
  "/admin": {
    description: "Synchroniser les données FFTT et gérer les accès",
    cta: "Ouvrir l'administration",
    color: "secondary",
  },
  "/club/parametrage-inscription": {
    description: "Configurer campagnes, tarifs et règles d'adhésion",
    cta: "Configurer les campagnes",
    color: "info",
  },
  "/club/inscription": {
    description:
      "Enregistrer un dossier à partir d'une fiche papier ou d'un échange au secrétariat",
    cta: "Ouvrir le formulaire",
    color: "primary",
  },
  "/club/mes-inscriptions": {
    description: "Suivre vos propres dossiers d'adhésion",
    cta: "Voir mes dossiers",
    color: "primary",
  },
  "/club/idees": {
    description: "Proposer des évolutions ou signaler un problème sur l'application",
    cta: "Ouvrir idées & remontées",
    color: "warning",
  },
};

function toHomeLinkCard(item: LayoutNavigationItem): HomeLinkCard {
  const meta = HOME_LINK_META[item.href];
  if (!meta) {
    return {
      ...item,
      description: "",
      cta: item.label,
      color: "primary",
    };
  }
  return { ...item, ...meta };
}

function toHomeLinkCards(items: LayoutNavigationItem[]): HomeLinkCard[] {
  return items.map(toHomeLinkCard);
}

export function buildCoachAdminHomeContent(isAdmin: boolean): {
  heroSubtitle: string;
  heroCtas: LayoutNavigationItem[];
  sections: HomeDashboardSection[];
} {
  if (isAdmin) {
    return {
      heroSubtitle:
        "Pilotez le championnat, validez les adhésions et administrez la plateforme depuis un même point d'entrée.",
      heroCtas: [
        LAYOUT_NAV.dossiersAValider,
        LAYOUT_NAV.compositions,
        LAYOUT_NAV.boiteIdees,
        LAYOUT_NAV.administration,
      ],
      sections: [
        {
          id: "championnat",
          title: "Championnat",
          items: toHomeLinkCards([
            LAYOUT_NAV.joueurs,
            LAYOUT_NAV.equipes,
            LAYOUT_NAV.disponibilites,
            LAYOUT_NAV.modelesComposition,
          ]),
        },
        {
          id: "adhesions",
          title: "Adhésions",
          items: toHomeLinkCards([
            LAYOUT_NAV.dossiersAValider,
            LAYOUT_NAV.tableauAdhesions,
            LAYOUT_NAV.campagnesTarifs,
            LAYOUT_NAV.apercuFormulaire,
          ]),
        },
        {
          id: "ideas",
          title: "Retours sur l'application",
          items: toHomeLinkCards([LAYOUT_NAV.boiteIdees]),
        },
        {
          id: "account",
          title: "Mon compte",
          items: toHomeLinkCards([LAYOUT_NAV.mesDossiers]),
        },
      ],
    };
  }

  return {
    heroSubtitle:
      "Préparez vos compositions, collectez les disponibilités et pilotez le championnat du club.",
    heroCtas: [
      LAYOUT_NAV.compositions,
      LAYOUT_NAV.disponibilites,
      LAYOUT_NAV.boiteIdees,
    ],
    sections: [
      {
        id: "championnat",
        title: "Championnat",
        items: toHomeLinkCards([
          LAYOUT_NAV.joueurs,
          LAYOUT_NAV.equipes,
          LAYOUT_NAV.modelesComposition,
        ]),
      },
      {
        id: "ideas",
        title: "Retours sur l'application",
        items: toHomeLinkCards([LAYOUT_NAV.boiteIdees]),
      },
      {
        id: "account",
        title: "Mon compte",
        items: toHomeLinkCards([
          LAYOUT_NAV.mesDossiers,
          LAYOUT_NAV.nouvelleAdhesion,
        ]),
      },
    ],
  };
}
