import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface DayComposition {
  journee: number;
  phase: "aller" | "retour";
  championshipType: "masculin" | "feminin";
  teams: {
    [teamId: string]: string[]; // teamId -> playerIds[]
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export class CompositionService {
  private readonly collectionName = "compositions";

  private getDocumentId(
    journee: number,
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin"
  ): string {
    return `${phase}_${journee}_${championshipType}`;
  }

  async getComposition(
    journee: number,
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin"
  ): Promise<DayComposition | null> {
    try {
      const docId = this.getDocumentId(journee, phase, championshipType);
      const docRef = doc(db, this.collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          journee: data.journee,
          phase: data.phase || phase,
          championshipType: data.championshipType,
          teams: data.teams || {},
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : data.createdAt?.toDate?.() || new Date(),
          updatedAt:
            data.updatedAt instanceof Timestamp
              ? data.updatedAt.toDate()
              : data.updatedAt?.toDate?.() || new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération de la composition:", error);
      throw error;
    }
  }

  async saveComposition(composition: DayComposition): Promise<void> {
    try {
      const docId = this.getDocumentId(
        composition.journee,
        composition.phase,
        composition.championshipType
      );
      const docRef = doc(db, this.collectionName, docId);

      const dataToSave: Record<string, any> = {
        journee: composition.journee,
        phase: composition.phase,
        championshipType: composition.championshipType,
        teams: composition.teams,
        updatedAt: Timestamp.fromDate(new Date()),
        createdAt: composition.createdAt
          ? composition.createdAt instanceof Date
            ? Timestamp.fromDate(composition.createdAt)
            : Timestamp.fromDate(new Date(composition.createdAt))
          : Timestamp.fromDate(new Date()),
      };

      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la composition:", error);
      throw error;
    }
  }
}


