import { ChampionshipType } from "@/types";

export function getCompositionDocumentId(
  journee: number,
  phase: "aller" | "retour",
  championshipType: ChampionshipType,
  idEpreuve?: number
): string {
  if (idEpreuve !== undefined) {
    return `${phase}_${journee}_${championshipType}_${idEpreuve}`;
  }
  return `${phase}_${journee}_${championshipType}`;
}

export function getCompositionDefaultsDocumentId(
  phase: "aller" | "retour",
  championshipType: ChampionshipType,
  idEpreuve?: number
): string {
  if (idEpreuve !== undefined) {
    return `${phase}_${championshipType}_${idEpreuve}`;
  }
  return `${phase}_${championshipType}`;
}
