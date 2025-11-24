import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";

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
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);
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
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);

      const dataToSave: Record<string, unknown> = {
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

  /**
   * S'abonne aux changements de composition en temps réel
   * @param journee - Numéro de la journée
   * @param phase - Phase du championnat (aller/retour)
   * @param championshipType - Type de championnat (masculin/feminin)
   * @param callback - Fonction appelée à chaque changement
   * @returns Fonction pour se désabonner
   */
  subscribeToComposition(
    journee: number,
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin",
    callback: (composition: DayComposition | null) => void
  ): Unsubscribe {
    try {
      const docId = this.getDocumentId(journee, phase, championshipType);
      const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);

      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const composition: DayComposition = {
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
            callback(composition);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error(
            `[CompositionService] Erreur lors de l'écoute de la composition (${docId}):`,
            error
          );
          // En cas d'erreur, on appelle le callback avec null pour indiquer qu'il n'y a pas de données
          callback(null);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error(
        "[CompositionService] Erreur lors de la création de l'abonnement:",
        error
      );
      // Retourner une fonction no-op en cas d'erreur
      return () => {
        // No-op
      };
    }
  }
}


