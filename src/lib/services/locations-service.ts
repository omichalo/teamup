import {
  collection,
  getDocs,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";

export interface Location {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LocationsService {
  private readonly collectionName = "locations";

  async getAllLocations(): Promise<Location[]> {
    try {
      const locationsRef = collection(getDbInstanceDirect(), this.collectionName);
      const q = query(locationsRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name as string,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération des lieux:", error);
      throw error;
    }
  }

  async addLocation(name: string): Promise<string> {
    try {
      const locationsRef = collection(getDbInstanceDirect(), this.collectionName);
      const now = new Date();
      const docRef = await addDoc(locationsRef, {
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
      });
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de l'ajout du lieu:", error);
      throw error;
    }
  }

  async deleteLocation(locationId: string): Promise<void> {
    try {
      const locationRef = doc(getDbInstanceDirect(), this.collectionName, locationId);
      await deleteDoc(locationRef);
    } catch (error) {
      console.error("Erreur lors de la suppression du lieu:", error);
      throw error;
    }
  }
}

