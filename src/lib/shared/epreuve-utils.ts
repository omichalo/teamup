// Type pour les épreuves : "championnat_equipes" regroupe les épreuves 15954 (masculin) et 15955 (féminin)
// "championnat_paris" correspond à l'épreuve 15980
export type EpreuveType = "championnat_equipes" | "championnat_paris";

// ID des épreuves FFTT
export const ID_EPREUVE_MASCULIN = 15954;
export const ID_EPREUVE_FEMININ = 15955;
export const ID_EPREUVE_PARIS = 15980;

/**
 * Calcule l'idEpreuve à partir de selectedEpreuve
 * @param epreuve - Type d'épreuve sélectionné
 * @returns ID de l'épreuve FFTT ou undefined pour la rétrocompatibilité
 */
export function getIdEpreuve(epreuve: EpreuveType | null): number | undefined {
  if (epreuve === "championnat_equipes") {
    // Pour le championnat par équipes, on utilise undefined pour la rétrocompatibilité
    // (les anciennes disponibilités sans idEpreuve sont pour le championnat par équipes)
    return undefined;
  }
  if (epreuve === "championnat_paris") {
    return ID_EPREUVE_PARIS;
  }
  return undefined;
}

/**
 * Détermine l'épreuve d'un match ou d'une équipe
 * @param match - Match avec idEpreuve optionnel
 * @param equipe - Équipe avec idEpreuve et epreuve optionnels
 * @returns Type d'épreuve ou null si non déterminable
 */
export function getMatchEpreuve(
  match: { idEpreuve?: number },
  equipe?: { idEpreuve?: number; epreuve?: string }
): EpreuveType | null {
  // Essayer d'abord depuis le match
  const idEpreuve = match.idEpreuve ?? equipe?.idEpreuve;
  
  if (idEpreuve === ID_EPREUVE_MASCULIN || idEpreuve === ID_EPREUVE_FEMININ) {
    return "championnat_equipes";
  }
  if (idEpreuve === ID_EPREUVE_PARIS) {
    return "championnat_paris";
  }
  
  // Fallback : vérifier le libellé de l'épreuve
  if (equipe?.epreuve) {
    const epreuveLower = equipe.epreuve.toLowerCase();
    if (epreuveLower.includes("paris idf") || epreuveLower.includes("excellence")) {
      return "championnat_paris";
    }
    if (epreuveLower.includes("championnat de france") || epreuveLower.includes("par équipes")) {
      return "championnat_equipes";
    }
  }
  
  return null;
}





