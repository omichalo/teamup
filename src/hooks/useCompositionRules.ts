import { useMemo } from "react";
import type { CompositionRuleItem } from "@/components/compositions/CompositionRulesHelp";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

/**
 * Règles communes pour le championnat de Paris
 */
const PARIS_RULES: CompositionRuleItem[] = [
  {
    id: "paris-structure",
    label:
      "Structure par groupes : 3 groupes de 3 joueurs (Excellence, Promo Excellence, Honneur), 2 groupes de 3 (Division 1), 1 groupe de 3 (Division 2)",
    scope: "both",
  },
  {
    id: "paris-article8",
    label:
      "Article 8 : Les joueurs du groupe 2 doivent avoir des points entre le max du groupe 1 et le min du groupe 3. Permutation possible dans un même groupe.",
    scope: "both",
  },
  {
    id: "paris-article12",
    label:
      "Article 12 : Maximum 1 joueur brûlé par groupe de 3. Si 2 joueurs brûlés dans un même groupe, les 2 sont non qualifiés.",
    scope: "both",
  },
  {
    id: "paris-burning",
    label:
      "Brûlage : Un joueur est brûlé s'il a joué 3 matchs ou plus dans UNE équipe de numéro inférieur. Il ne peut alors jouer que dans cette équipe ou une équipe de numéro supérieur.",
    scope: "both",
  },
  {
    id: "paris-mixte",
    label:
      "Championnat mixte : pas de distinction masculin/féminin, une seule phase",
    scope: "both",
  },
];

/**
 * Règles communes pour le championnat par équipes
 */
const EQUIPES_COMMON_RULES: CompositionRuleItem[] = [
  {
    id: "foreign",
    label: "Maximum un joueur étranger (ETR) par équipe",
    scope: "both",
  },
  {
    id: "female-in-male",
    label: "Une équipe masculine ne peut comporter plus de deux joueuses",
    scope: "both",
  },
  {
    id: "burning",
    label:
      "Brûlage : Un joueur est brûlé s'il a joué 2 matchs ou plus dans une équipe de numéro inférieur. Il ne peut alors jouer que dans cette équipe ou une équipe de numéro supérieur.",
    scope: "both",
  },
  {
    id: "fftt",
    label:
      "Points minimum selon division : Messieurs N1 (≥1800), N2 (≥1600), N3 (≥1400) | Dames N1 (≥1100), N2 (≥900 pour 2 sur 4)",
    scope: "both",
  },
];

/**
 * Hook pour obtenir les règles de composition selon le type d'épreuve et le contexte
 */
export function useCompositionRules(
  epreuve: EpreuveType | null,
  context: "daily" | "defaults"
): CompositionRuleItem[] {
  return useMemo(() => {
    if (epreuve === "championnat_paris") {
      return PARIS_RULES;
    }

    // Règles pour le championnat par équipes
    const rules: CompositionRuleItem[] = [
      {
        id: "maxPlayersDaily",
        label: "Une composition de journée ne peut aligner que 4 joueurs",
        scope: "daily",
      },
      {
        id: "maxPlayersDefaults",
        label: "Une composition par défaut peut contenir jusqu'à 5 joueurs",
        scope: "defaults",
      },
      ...EQUIPES_COMMON_RULES,
    ];

    // Ajouter les règles spécifiques au contexte
    if (context === "daily") {
      rules.push({
        id: "journee2",
        label:
          "Journée 2 : au plus un joueur ayant joué la J1 dans une équipe de numéro inférieur",
        scope: "daily",
        description:
          "Cette règle ne s'applique que sur la page des compositions de journée lorsque la J2 est sélectionnée.",
      });
    } else {
      rules.push({
        id: "defaults-specific",
        label: "Aucune limitation de journée (J2) sur cette page",
        scope: "defaults",
        description:
          "Les règles spécifiques à la J2 ne sont appliquées que lors de la préparation d'une composition de journée.",
      });
    }

    return rules;
  }, [epreuve, context]);
}

