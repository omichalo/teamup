import type { LayoutNavigationItem } from "@/components/layout-navigation";

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
    description:
      "Saisir les disponibilités par journée et suivre les réponses.",
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
    description:
      "Vue d'ensemble de tous les dossiers, avec tri, filtres et export.",
    cta: "Ouvrir le tableau",
    color: "info",
  },
  "/club/statistiques-adherents": {
    description:
      "KPI et graphiques sur les adhérents du club (sexe, âge, section, ville…).",
    cta: "Voir les statistiques",
    color: "primary",
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
  "/club/export-comptable": {
    description:
      "Générer l'export Sage (écritures, tiers, anomalies) pour la comptabilité du club.",
    cta: "Ouvrir l'export comptable",
    color: "warning",
  },
  "/club/inscription": {
    description:
      "Créer un dossier d'adhésion pour vous, un proche ou un membre du club.",
    cta: "Ouvrir le formulaire",
    color: "primary",
  },
  "/club/mes-inscriptions": {
    description: "Suivre vos propres dossiers d'adhésion.",
    cta: "Voir mes dossiers",
    color: "primary",
  },
  "/club/ma-fiche": {
    description:
      "Vue d’ensemble de votre adhésion : créneaux, présences, finances et stages.",
    cta: "Ouvrir ma fiche",
    color: "primary",
  },
  "/club/idees": {
    description:
      "Proposer une évolution TeamUp ou club, ou signaler un problème.",
    cta: "Ouvrir la boîte à idées",
    color: "warning",
  },
  "/club/validations-licence": {
    description: "Saisir les licences FFTT et suivre les encaissements.",
    cta: "Ouvrir l'espace licences",
    color: "success",
  },
  "/club/matchs-hors-inscription": {
    description:
      "Suivre les joueurs ayant joué sans option dossier, et ceux qui ont payé sans avoir encore joué.",
    cta: "Ouvrir le suivi",
    color: "warning",
  },
  "/club/presences": {
    description:
      "Pointer les présences d'entraînement et de stage, et consulter les taux.",
    cta: "Ouvrir le pointage",
    color: "info",
  },
  "/club/creneaux": {
    description: "Taux de remplissage des créneaux et liste des inscrits.",
    cta: "Voir les créneaux",
    color: "info",
  },
  "/club/presences/essais": {
    description: "Relancer les personnes venues essayer un entraînement.",
    cta: "Ouvrir les essais",
    color: "warning",
  },
  "/club/stages": {
    description:
      "Créer et ouvrir les stages vacances, assigner sites/formules et générer les créneaux.",
    cta: "Gérer les stages",
    color: "secondary",
  },
  "/club/stages/catalogue": {
    description:
      "Sites, formules, horaires et grilles tarifaires réutilisables entre stages.",
    cta: "Ouvrir le catalogue",
    color: "secondary",
  },
  "/club/stages/paiements": {
    description: "Encaissements Stripe/manuels et pièces STG-FAC / STG-REC.",
    cta: "Ouvrir les paiements",
    color: "warning",
  },
  "/club/stages/tableau": {
    description: "Toutes les inscriptions aux stages, filtrables.",
    cta: "Ouvrir les inscriptions",
    color: "info",
  },
  "/club/stages/statistiques": {
    description: "Effectifs, encaissements et remplissage des créneaux.",
    cta: "Voir les statistiques",
    color: "primary",
  },
  "/club/mes-stages": {
    description:
      "S’inscrire aux stages ouverts, suivre vos inscriptions et payer.",
    cta: "Ouvrir mes stages",
    color: "primary",
  },
};

function isLayoutNavigationItem(
  item: LayoutNavigationItem | null | undefined
): item is LayoutNavigationItem {
  return Boolean(item && typeof item.href === "string" && item.href.length > 0);
}

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

export function cards(
  items: Array<LayoutNavigationItem | null | undefined>
): HomeLinkCard[] {
  return items.filter(isLayoutNavigationItem).map(toHomeLinkCard);
}

export function uniqueByHref(
  items: Array<LayoutNavigationItem | null | undefined>
): LayoutNavigationItem[] {
  const seen = new Set<string>();
  return items.filter(isLayoutNavigationItem).filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}
