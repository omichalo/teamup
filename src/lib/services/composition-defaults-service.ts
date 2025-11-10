import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";

export interface PhaseCompositionDefaults {
  phase: "aller" | "retour";
  championshipType: "masculin" | "feminin";
  teams: Record<string, string[]>;
  updatedAt?: Date;
}

export class CompositionDefaultsService {
  private readonly collectionName = "compositionDefaults";

  private getDocumentId(
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin"
  ): string {
    return `${phase}_${championshipType}`;
  }

  async getDefaults(
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin"
  ): Promise<PhaseCompositionDefaults | null> {
    try {
      const docId = this.getDocumentId(phase, championshipType);
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();

      return {
        phase: (data.phase as "aller" | "retour") ?? phase,
        championshipType:
          (data.championshipType as "masculin" | "feminin") ??
          championshipType,
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
    championshipType: "masculin" | "feminin";
    teams: Record<string, string[]>;
  }): Promise<void> {
    const { phase, championshipType, teams } = params;

    try {
      const docId = this.getDocumentId(phase, championshipType);
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);

      await setDoc(
        docRef,
        {
          phase,
          championshipType,
          teams,
          updatedAt: Timestamp.fromDate(new Date()),
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



