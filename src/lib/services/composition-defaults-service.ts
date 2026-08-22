import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { ChampionshipType } from "@/types";
import { getCompositionDefaultsDocumentId } from "@/lib/compositions/document-id";

export interface PhaseCompositionDefaults {
  phase: "aller" | "retour";
  championshipType: ChampionshipType;
  teams: Record<string, string[]>;
  updatedAt?: Date;
}

export class CompositionDefaultsService {
  private readonly collectionName = "compositionDefaults";

  private getDocumentId(
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number
  ): string {
    return getCompositionDefaultsDocumentId(phase, championshipType, idEpreuve);
  }

  async getDefaults(
    phase: "aller" | "retour",
    championshipType: ChampionshipType,
    idEpreuve?: number | undefined
  ): Promise<PhaseCompositionDefaults | null> {
    try {
      const docId = this.getDocumentId(phase, championshipType, idEpreuve);
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();

      return {
        phase: (data.phase as "aller" | "retour") ?? phase,
        championshipType:
          (data.championshipType as ChampionshipType) ?? championshipType,
        teams: (data.teams as Record<string, string[]>) ?? {},
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : data.updatedAt?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des compositions par défaut:",
        error
      );
      throw error;
    }
  }

  async saveDefaults(params: {
    phase: "aller" | "retour";
    championshipType: ChampionshipType;
    teams: Record<string, string[]>;
    idEpreuve?: number | undefined;
  }): Promise<void> {
    const { phase, championshipType, teams, idEpreuve } = params;

    try {
      const docId = this.getDocumentId(phase, championshipType, idEpreuve);
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);

      await setDoc(
        docRef,
        {
          phase,
          championshipType,
          teams,
          updatedAt: Timestamp.fromDate(new Date()),
          ...(idEpreuve !== undefined ? { idEpreuve } : {}),
        },
        { merge: true }
      );
    } catch (error) {
      console.error(
        "Erreur lors de la sauvegarde des compositions par défaut:",
        error
      );
      throw error;
    }
  }
}



