import type { LayoutNavigationItem } from "@/components/layout-navigation";
import { LAYOUT_NAV } from "@/components/layout-navigation";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";

export const HOME_HERO_IMAGE_SRC = "/sqyping-home-hero.jpg";
export const HOME_HERO_IMAGE_ALT =
  "Joueuses et joueurs de SQY Ping — visuel du site sqyping.fr";

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

export type HomeDashboardSectionId = "championnat" | "adhesions" | "club";

export type HomeDashboardSection = {
  id: HomeDashboardSectionId;
  title: string;
  description: string;
  items: HomeLinkCard[];
};

export type RoleHomeContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: HomeDashboardSection[];
};

const HOME_LINK_META: Record<
  string,
  { description: string; cta: string; color: HomeLinkColor }
> = {
  "/joueurs": {
    description: "Gérer les joueurs, participations et équipes préférées.",
    cta: "Gérer les joueurs",
    color: "primary",
  },
  "/equipes": {
    description: "Consulter les équipes, résultats et classements.",
    cta: "Voir les équipes",
    color: "secondary",
  },
  "/disponibilites": {
    description: "Saisir les disponibilités par journée et suivre les réponses.",
    cta: "Gérer les disponibilités",
    color: "info",
  },
  "/compositions": {
    description: "Composer les équipes en respectant les règles de brûlage.",
    cta: "Composer les équipes",
    color: "warning",
  },
  "/compositions/defaults": {
    description: "Définir la base de chaque équipe en début de phase.",
    cta: "Configurer les modèles",
    color: "success",
  },
  "/club/demandes-adhesion": {
    description: "Traiter les dossiers soumis et suivre les paiements.",
    cta: "Ouvrir les dossiers",
    color: "secondary",
  },
  "/club/adhesions-tableau": {
    description: "Vue d'ensemble de tous les dossiers, avec tri, filtres et export.",
    cta: "Ouvrir le tableau",
    color: "info",
  },
  "/admin": {
    description: "Synchroniser les données FFTT et gérer les accès.",
    cta: "Ouvrir l'administration",
    color: "secondary",
  },
  "/club/parametrage-inscription": {
    description: "Configurer campagnes, tarifs et règles d'adhésion.",
    cta: "Configurer les campagnes",
    color: "info",
  },
  "/club/inscription": {
    description: "Créer un dossier d'adhésion pour vous, un proche ou un membre du club.",
    cta: "Ouvrir le formulaire",
    color: "primary",
  },
  "/club/mes-inscriptions": {
    description: "Suivre vos propres dossiers d'adhésion.",
    cta: "Voir mes dossiers",
    color: "primary",
  },
  "/club/idees": {
    description: "Proposer une évolution ou signaler un problème sur l'application.",
    cta: "Ouvrir idées & remontées",
    color: "warning",
  },
  "/club/validations-licence": {
    description: "Saisir les licences FFTT et suivre les encaissements.",
    cta: "Ouvrir l'espace licences",
    color: "success",
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

function cards(items: LayoutNavigationItem[]): HomeLinkCard[] {
  return items.map(toHomeLinkCard);
}

function uniqueByHref(items: LayoutNavigationItem[]): LayoutNavigationItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

const TITLE = "Bienvenue sur TeamUp";

function intro(
  eyebrow: string,
  subtitle: string,
  sections: HomeDashboardSection[]
): RoleHomeContent {
  return { eyebrow, title: TITLE, subtitle, sections };
}

function playerHome(): RoleHomeContent {
  return intro(
    "Espace adhérent",
    "Vos démarches d'adhésion, au même endroit.",
    [
      {
        id: "adhesions",
        title: "Adhésions",
        description: "Créer un dossier et suivre ceux déjà transmis au club.",
        items: cards([LAYOUT_NAV.nouvelleAdhesion, LAYOUT_NAV.mesDossiers]),
      },
    ]
  );
}

function boardMemberHome(): RoleHomeContent {
  return intro(
    "Espace membre du bureau",
    "Même parcours qu'un adhérent, avec la vue d'ensemble des dossiers du club.",
    [
      {
        id: "adhesions",
        title: "Adhésions",
        description: "Vos dossiers personnels et le tableau de tous les adhérents.",
        items: cards([
          LAYOUT_NAV.tableauAdhesions,
          LAYOUT_NAV.nouvelleAdhesion,
          LAYOUT_NAV.mesDossiers,
        ]),
      },
    ]
  );
}

function assistantSecretaryHome(): RoleHomeContent {
  return intro(
    "Espace secrétaire adjoint",
    "Vos dossiers, plus l'aide au secrétariat : tableau des adhésions et licences.",
    [
      {
        id: "adhesions",
        title: "Adhésions",
        description: "Consultation des dossiers du club et suivi de vos propres inscriptions.",
        items: cards([
          LAYOUT_NAV.tableauAdhesions,
          LAYOUT_NAV.validationsLicence,
          LAYOUT_NAV.nouvelleAdhesion,
          LAYOUT_NAV.mesDossiers,
        ]),
      },
    ]
  );
}

function coachHome(): RoleHomeContent {
  return intro(
    "Espace coach",
    "Préparez le championnat et consultez les adhésions du club.",
    [
      {
        id: "championnat",
        title: "Championnat",
        description: "Compositions, disponibilités et suivi des équipes.",
        items: cards([
          LAYOUT_NAV.compositions,
          LAYOUT_NAV.disponibilites,
          LAYOUT_NAV.joueurs,
          LAYOUT_NAV.equipes,
          LAYOUT_NAV.modelesComposition,
        ]),
      },
      {
        id: "adhesions",
        title: "Adhésions",
        description: "Vue d'ensemble des dossiers et vos propres inscriptions.",
        items: cards([
          LAYOUT_NAV.tableauAdhesions,
          LAYOUT_NAV.nouvelleAdhesion,
          LAYOUT_NAV.mesDossiers,
        ]),
      },
      {
        id: "club",
        title: "Vie du club",
        description: "Remontées sur l'application.",
        items: cards([LAYOUT_NAV.boiteIdees]),
      },
    ]
  );
}

function secretaryHome(): RoleHomeContent {
  return intro(
    "Espace secrétariat",
    "Validez les dossiers, suivez les licences et pilotez les campagnes d'adhésion.",
    [
      {
        id: "adhesions",
        title: "Adhésions",
        description: "Traitement des dossiers, tableau, tarifs et licences.",
        items: cards(
          uniqueByHref([
            LAYOUT_NAV.dossiersAValider,
            LAYOUT_NAV.tableauAdhesions,
            LAYOUT_NAV.campagnesTarifs,
            LAYOUT_NAV.apercuFormulaire,
            LAYOUT_NAV.validationsLicence,
            LAYOUT_NAV.mesDossiers,
          ])
        ),
      },
      {
        id: "club",
        title: "Vie du club",
        description: "Remontées sur l'application.",
        items: cards([LAYOUT_NAV.boiteIdees]),
      },
    ]
  );
}

function adminHome(): RoleHomeContent {
  return intro(
    "Espace administration",
    "Pilotez le championnat, les adhésions et les accès depuis un même accueil.",
    [
      {
        id: "championnat",
        title: "Championnat",
        description: "Compositions, disponibilités et suivi des équipes.",
        items: cards([
          LAYOUT_NAV.compositions,
          LAYOUT_NAV.disponibilites,
          LAYOUT_NAV.joueurs,
          LAYOUT_NAV.equipes,
          LAYOUT_NAV.modelesComposition,
        ]),
      },
      {
        id: "adhesions",
        title: "Adhésions",
        description: "Validation, tableau, tarifs, saisie et licences.",
        items: cards(
          uniqueByHref([
            LAYOUT_NAV.dossiersAValider,
            LAYOUT_NAV.tableauAdhesions,
            LAYOUT_NAV.campagnesTarifs,
            LAYOUT_NAV.apercuFormulaire,
            LAYOUT_NAV.validationsLicence,
            LAYOUT_NAV.mesDossiers,
          ])
        ),
      },
      {
        id: "club",
        title: "Vie du club",
        description: "Administration de la plateforme et remontées.",
        items: cards([LAYOUT_NAV.administration, LAYOUT_NAV.boiteIdees]),
      },
    ]
  );
}

export function buildRoleHomeContent(role: UserRole): RoleHomeContent {
  switch (role) {
    case USER_ROLES.ADMIN:
      return adminHome();
    case USER_ROLES.SECRETARY:
      return secretaryHome();
    case USER_ROLES.ASSISTANT_SECRETARY:
      return assistantSecretaryHome();
    case USER_ROLES.BOARD_MEMBER:
      return boardMemberHome();
    case USER_ROLES.COACH:
      return coachHome();
    case USER_ROLES.PLAYER:
      return playerHome();
  }
}

export function listHomeCardHrefs(content: RoleHomeContent): string[] {
  return content.sections.flatMap((section) =>
    section.items.map((item) => item.href)
  );
}
