import { LAYOUT_NAV } from "@/components/layout-navigation";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";
import {
  cards,
  uniqueByHref,
  type HomeLinkCard,
} from "@/lib/navigation/home-link-cards";

export type { HomeLinkCard, HomeLinkColor } from "@/lib/navigation/home-link-cards";

export const HOME_HERO_IMAGE_SRC = "/sqyping-home-hero.jpg";
export const HOME_HERO_IMAGE_ALT =
  "Joueuses et joueurs de SQY Ping — visuel du site sqyping.fr";

export type HomeDashboardSectionId =
  | "championnat"
  | "adhesions"
  | "stages"
  | "club";

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

const TITLE = "Bienvenue sur TeamUp";

function intro(
  eyebrow: string,
  subtitle: string,
  sections: HomeDashboardSection[],
): RoleHomeContent {
  return { eyebrow, title: TITLE, subtitle, sections };
}

function playerHome(): RoleHomeContent {
  return intro(
    "Espace adhérent",
    "Vos démarches d'adhésion, vos stages et vos idées pour le club.",
    [
      {
        id: "adhesions",
        title: "Adhésions",
        description: "Créer un dossier, suivre ceux transmis, et ouvrir votre fiche.",
        items: cards([
          LAYOUT_NAV.nouvelleAdhesion,
          LAYOUT_NAV.mesDossiers,
          LAYOUT_NAV.maFiche,
        ]),
      },
      {
        id: "stages",
        title: "Stages",
        description: "Inscriptions aux stages vacances et règlement.",
        items: cards([LAYOUT_NAV.mesStages]),
      },
      {
        id: "club",
        title: "Vie du club",
        description: "Proposer une idée ou signaler un problème.",
        items: cards([LAYOUT_NAV.boiteIdees]),
      },
    ],
  );
}

function boardMemberHome(): RoleHomeContent {
  return intro(
    "Espace membre du bureau",
    "Même parcours qu'un adhérent, avec le tableau des dossiers et le pointage des entraînements.",
    [
      {
        id: "adhesions",
        title: "Adhésions",
        description:
          "Vos dossiers, le tableau du club et les présences aux entraînements.",
        items: cards([
          LAYOUT_NAV.tableauAdhesions,
          LAYOUT_NAV.statistiquesAdherents,
          LAYOUT_NAV.presences,
          LAYOUT_NAV.creneaux,
          LAYOUT_NAV.presencesEssais,
          LAYOUT_NAV.nouvelleAdhesion,
          LAYOUT_NAV.mesDossiers,
          LAYOUT_NAV.maFiche,
        ]),
      },
      {
        id: "stages",
        title: "Stages",
        description: "Vos inscriptions aux stages vacances et paiements.",
        items: cards([LAYOUT_NAV.mesStages]),
      },
      {
        id: "club",
        title: "Vie du club",
        description: "Proposer une idée ou signaler un problème.",
        items: cards([LAYOUT_NAV.boiteIdees]),
      },
    ],
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
        description:
          "Consultation des dossiers du club et suivi de vos propres inscriptions.",
        items: cards([
          LAYOUT_NAV.tableauAdhesions,
          LAYOUT_NAV.statistiquesAdherents,
          LAYOUT_NAV.validationsLicence,
          LAYOUT_NAV.matchsHorsInscription,
          LAYOUT_NAV.nouvelleAdhesion,
          LAYOUT_NAV.mesDossiers,
          LAYOUT_NAV.maFiche,
        ]),
      },
      {
        id: "stages",
        title: "Stages",
        description: "Vos inscriptions aux stages vacances et paiements.",
        items: cards([LAYOUT_NAV.mesStages]),
      },
      {
        id: "club",
        title: "Vie du club",
        description: "Proposer une idée ou signaler un problème.",
        items: cards([LAYOUT_NAV.boiteIdees]),
      },
    ],
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
          LAYOUT_NAV.matchsHorsInscription,
        ]),
      },
      {
        id: "adhesions",
        title: "Adhésions",
        description: "Vue d'ensemble des dossiers et vos propres inscriptions.",
        items: cards([
          LAYOUT_NAV.tableauAdhesions,
          LAYOUT_NAV.statistiquesAdherents,
          LAYOUT_NAV.nouvelleAdhesion,
          LAYOUT_NAV.mesDossiers,
          LAYOUT_NAV.maFiche,
        ]),
      },
      {
        id: "stages",
        title: "Stages",
        description: "Vos inscriptions aux stages vacances et paiements.",
        items: cards([LAYOUT_NAV.mesStages]),
      },
      {
        id: "club",
        title: "Vie du club",
        description:
          "Présences aux entraînements et remontées sur l'application.",
        items: cards([LAYOUT_NAV.presences, LAYOUT_NAV.creneaux, LAYOUT_NAV.boiteIdees]),
      },
    ],
  );
}

function secretaryHome(): RoleHomeContent {
  return intro(
    "Espace secrétariat",
    "Validez les dossiers, pilotez les stages vacances et suivez les licences.",
    [
      {
        id: "adhesions",
        title: "Adhésions",
        description: "Traitement des dossiers, tableau, tarifs et licences.",
        items: cards(
          uniqueByHref([
            LAYOUT_NAV.dossiersAValider,
            LAYOUT_NAV.tableauAdhesions,
            LAYOUT_NAV.statistiquesAdherents,
            LAYOUT_NAV.campagnesTarifs,
            LAYOUT_NAV.exportComptable,
            LAYOUT_NAV.apercuFormulaire,
            LAYOUT_NAV.validationsLicence,
            LAYOUT_NAV.matchsHorsInscription,
            LAYOUT_NAV.mesDossiers,
            LAYOUT_NAV.maFiche,
          ]),
        ),
      },
      {
        id: "stages",
        title: "Stages",
        description:
          "Administration des stages, catalogue, paiements et vos propres inscriptions.",
        items: cards([
          LAYOUT_NAV.stages,
          LAYOUT_NAV.stagesCatalogue,
          LAYOUT_NAV.stagesPaiements,
          LAYOUT_NAV.stagesTableau,
          LAYOUT_NAV.stagesStatistiques,
          LAYOUT_NAV.mesStages,
        ]),
      },
      {
        id: "club",
        title: "Vie du club",
        description:
          "Présences (entraînement et stages) et remontées sur l'application.",
        items: cards([
          LAYOUT_NAV.presences,
          LAYOUT_NAV.creneaux,
          LAYOUT_NAV.presencesEssais,
          LAYOUT_NAV.boiteIdees,
        ]),
      },
    ],
  );
}

function adminHome(): RoleHomeContent {
  return intro(
    "Espace administration",
    "Pilotez le championnat, les adhésions, les stages et les accès.",
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
            LAYOUT_NAV.statistiquesAdherents,
            LAYOUT_NAV.campagnesTarifs,
            LAYOUT_NAV.exportComptable,
            LAYOUT_NAV.apercuFormulaire,
            LAYOUT_NAV.validationsLicence,
            LAYOUT_NAV.matchsHorsInscription,
            LAYOUT_NAV.mesDossiers,
            LAYOUT_NAV.maFiche,
          ]),
        ),
      },
      {
        id: "stages",
        title: "Stages",
        description:
          "Administration des stages, catalogue, paiements et vos propres inscriptions.",
        items: cards([
          LAYOUT_NAV.stages,
          LAYOUT_NAV.stagesCatalogue,
          LAYOUT_NAV.stagesPaiements,
          LAYOUT_NAV.stagesTableau,
          LAYOUT_NAV.stagesStatistiques,
          LAYOUT_NAV.mesStages,
        ]),
      },
      {
        id: "club",
        title: "Vie du club",
        description: "Présences (entraînement et stages), administration et remontées.",
        items: cards([
          LAYOUT_NAV.presences,
          LAYOUT_NAV.creneaux,
          LAYOUT_NAV.presencesEssais,
          LAYOUT_NAV.administration,
          LAYOUT_NAV.boiteIdees,
        ]),
      },
    ],
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
    section.items.map((item) => item.href),
  );
}
