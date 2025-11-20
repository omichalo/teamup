import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  QueryDocumentSnapshot,
  DocumentData,
  deleteField,
} from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { Player } from "@/types/team-management";

export class FirestorePlayerService {
  private readonly collectionName = "players";

  // Convertir les données Firestore vers le format Player
  private convertFirestoreToPlayer(doc: QueryDocumentSnapshot<DocumentData>): Player {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.nom || "",
      firstName: data.prenom || "",
      license: data.licence || "",
      typeLicence: data.typeLicence || "",
      gender: data.sexe === "F" ? "F" : "M",
      nationality:
        data.nationalite === "F"
          ? "FR"
          : data.nationalite === "C"
          ? "C"
          : "ETR",
      isActive: this.calculateIsActive(data.licence, data.typeLicence),
      isTemporary: data.isTemporary || false,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      // Champs de gestion des équipes
      preferredTeams: {
        masculine: data.preferredTeams?.masculine || [],
        feminine: data.preferredTeams?.feminine || [],
      },
      participation: {
        ...data.participation,
        championnat: data.participation?.championnat || false,
      },
      hasPlayedAtLeastOneMatch: data.hasPlayedAtLeastOneMatch || false,
      highestMasculineTeamNumberByPhase: data.highestMasculineTeamNumberByPhase,
      highestFeminineTeamNumberByPhase: data.highestFeminineTeamNumberByPhase,
      masculineMatchesByTeamByPhase: data.masculineMatchesByTeamByPhase || {},
      feminineMatchesByTeamByPhase: data.feminineMatchesByTeamByPhase || {},
      discordMentions: data.discordMentions || undefined,
      // Champs additionnels de l&apos;API FFTT
      numClub: data.numClub,
      club: data.club,
      classement: data.classement,
      points: data.points || 0,
      categorie: data.categorie,
      dateNaissance: data.dateNaissance,
      lieuNaissance: data.lieuNaissance,
      datePremiereLicence: data.datePremiereLicence,
      clubPrecedent: data.clubPrecedent,
      certificat: data.certificat,
      pointsMensuel: data.pointsMensuel,
      pointsMensuelAnciens: data.pointsMensuelAnciens,
      pointDebutSaison: data.pointDebutSaison,
      pointsLicence: data.pointsLicence,
      idLicence: data.idLicence,
      nomClub: data.nomClub,
      isHomme: data.isHomme,
      ...(data.place ? { place: parseInt(data.place) } : {}),
    };
  }

  // Calculer si un joueur est actif basé sur sa licence et son type
  private calculateIsActive(licence: string, typeLicence?: string): boolean {
    if (!licence || licence.trim() === "") {
      return false; // Pas de licence = pas actif
    }

    // Si typeLicence existe, seuls T, P et A sont actifs
    if (typeLicence) {
      return typeLicence === "T" || typeLicence === "P" || typeLicence === "A";
    }

    // Si pas de typeLicence mais licence existe, considérer comme inactif
    return false;
  }

  async getAllPlayers(): Promise<Player[]> {
    try {
      const playersRef = collection(getDbInstanceDirect(), this.collectionName);
      const q = query(playersRef, orderBy("nom", "asc"));
      const querySnapshot = await getDocs(q);

      const players = querySnapshot.docs.map((doc) =>
        this.convertFirestoreToPlayer(doc)
      );

      // Trier par points (décroissant) puis par nom (croissant)
      players.sort((a, b) => {
        const pointsA = a.points || 0;
        const pointsB = b.points || 0;
        if (pointsA !== pointsB) {
          return pointsB - pointsA; // Décroissant par points
        }
        return a.name.localeCompare(b.name); // Croissant par nom
      });

      return players;
    } catch (error) {
      console.error("Erreur lors de la récupération des joueurs:", error);
      throw error;
    }
  }

  async getActivePlayers(): Promise<Player[]> {
    try {
      const allPlayers = await this.getAllPlayers();
      const activePlayers = allPlayers.filter((player) => player.isActive);

      return activePlayers;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des joueurs actifs:",
        error
      );
      throw error;
    }
  }

  async getPlayersByGender(gender: "M" | "F"): Promise<Player[]> {
    try {
      const allPlayers = await this.getAllPlayers();
      const genderPlayers = allPlayers.filter(
        (player) => player.gender === gender && player.isActive
      );

      return genderPlayers.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des joueurs par genre:",
        error
      );
      throw error;
    }
  }

  async updatePlayer(
    playerId: string,
    updates: Partial<Player>
  ): Promise<void> {
    try {
      const playerRef = doc(getDbInstanceDirect(), this.collectionName, playerId);
      
      // Lire le document actuel pour préserver les autres champs
      const currentDoc = await getDoc(playerRef);
      if (!currentDoc.exists()) {
        throw new Error(`Joueur ${playerId} introuvable`);
      }
      
      // Convertir les champs Player vers le format Firestore
      const firestoreUpdates: Record<string, unknown> = {
        ...currentDoc.data(), // Préserver tous les champs existants
      };
      
      // Gérer discordMentions : si le champ est présent dans updates, le traiter
      if (updates.discordMentions !== undefined) {
        if (updates.discordMentions.length === 0) {
          // Tableau vide : supprimer le champ de Firestore avec deleteField()
          firestoreUpdates.discordMentions = deleteField();
          console.log(`[FirestorePlayerService] Suppression du champ discordMentions pour le joueur ${playerId} (tableau vide)`);
        } else {
          // Tableau non vide : mettre à jour avec le nouveau tableau
          firestoreUpdates.discordMentions = updates.discordMentions;
          console.log(`[FirestorePlayerService] Mise à jour de discordMentions pour le joueur ${playerId}:`, updates.discordMentions);
        }
      }
      // Si discordMentions n'est pas dans updates, on ne le modifie pas (préserve la valeur existante)
      
      // Utiliser updateDoc pour permettre l'utilisation de deleteField()
      await updateDoc(playerRef, firestoreUpdates);
      console.log(`[FirestorePlayerService] Mise à jour réussie pour le joueur ${playerId}`);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du joueur:", error);
      throw error;
    }
  }

  async updatePlayerParticipation(
    playerId: string,
    teamId: string,
    isParticipating: boolean
  ): Promise<void> {
    try {
      const playerRef = doc(getDbInstanceDirect(), this.collectionName, playerId);
      const updateData = {
        [`participations.${teamId}`]: isParticipating,
      };
      await updateDoc(playerRef, updateData);
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de la participation:",
        error
      );
      throw error;
    }
  }

  async searchPlayers(searchQuery: string): Promise<Player[]> {
    try {
      const players = await this.getActivePlayers();
      const query = searchQuery.toLowerCase();

      return players.filter(
        (player) =>
          player.name.toLowerCase().includes(query) ||
          player.firstName.toLowerCase().includes(query) ||
          player.license.includes(query)
      );
    } catch (error) {
      console.error("Erreur lors de la recherche de joueurs:", error);
      throw error;
    }
  }

  // Récupérer les joueurs sans licence (pour recherche et ajout)
  async getPlayersWithoutLicense(): Promise<Player[]> {
    try {
      const allPlayers = await this.getAllPlayers();
      const playersWithoutLicense = allPlayers.filter(
        (player) => !player.isActive && !player.isTemporary
      );

      return playersWithoutLicense;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des joueurs sans licence:",
        error
      );
      throw error;
    }
  }

  // Récupérer les joueurs temporaires
  async getTemporaryPlayers(): Promise<Player[]> {
    try {
      const allPlayers = await this.getAllPlayers();
      const temporaryPlayers = allPlayers.filter(
        (player) => player.isTemporary
      );

      return temporaryPlayers;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des joueurs temporaires:",
        error
      );
      throw error;
    }
  }

  // Recherche globale (actifs + sans licence + temporaires)
  async searchAllPlayers(searchQuery: string): Promise<Player[]> {
    try {
      const allPlayers = await this.getAllPlayers();
      const query = searchQuery.toLowerCase();

      return allPlayers.filter(
        (player) =>
          player.name.toLowerCase().includes(query) ||
          player.firstName.toLowerCase().includes(query) ||
          player.license.includes(query)
      );
    } catch (error) {
      console.error("Erreur lors de la recherche globale de joueurs:", error);
      throw error;
    }
  }

  // Vérifier si un joueur existe déjà avec cette licence
  async checkPlayerExists(license: string): Promise<boolean> {
    try {
      if (!license || license.trim() === "") {
        return false;
      }
      const playerRef = doc(getDbInstanceDirect(), this.collectionName, license.trim());
      const playerSnap = await getDoc(playerRef);
      return playerSnap.exists();
    } catch (error) {
      console.error("Erreur lors de la vérification de l'existence du joueur:", error);
      throw error;
    }
  }

  // Créer un joueur temporaire
  async createTemporaryPlayer(
    playerData: Omit<Player, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      // Déterminer l'ID du document : licence si fournie, sinon générer un ID
      const documentId = playerData.license && playerData.license.trim() !== ""
        ? playerData.license.trim()
        : undefined; // Si pas de licence, Firestore générera un ID

      // Si une licence est fournie, vérifier qu'elle n'existe pas déjà
      if (documentId) {
        const exists = await this.checkPlayerExists(documentId);
        if (exists) {
          throw new Error(`Un joueur avec la licence ${documentId} existe déjà`);
        }
      }

      const newPlayer = {
        nom: playerData.name,
        prenom: playerData.firstName,
        licence: playerData.license || "",
        typeLicence: playerData.typeLicence || "",
        sexe: playerData.gender,
        nationalite: playerData.nationality === "FR" ? "F" : playerData.nationality === "C" ? "C" : "ETR",
        isTemporary: true, // Impératif : marquer comme temporaire
        preferredTeams: playerData.preferredTeams || {
          masculine: [],
          feminine: [],
        },
        participation: playerData.participation || {
          championnat: false,
        },
        hasPlayedAtLeastOneMatch: playerData.hasPlayedAtLeastOneMatch || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Champs additionnels
        numClub: playerData.numClub || "",
        club: playerData.club || "",
        classement: playerData.classement || 0,
        points: playerData.points || 0,
        categorie: playerData.categorie || "",
        dateNaissance: playerData.dateNaissance || "",
        lieuNaissance: playerData.lieuNaissance || "",
        datePremiereLicence: playerData.datePremiereLicence || "",
        clubPrecedent: playerData.clubPrecedent || "",
        certificat: playerData.certificat || false,
        pointsMensuel: playerData.pointsMensuel || 0,
        pointsMensuelAnciens: playerData.pointsMensuelAnciens || 0,
        pointDebutSaison: playerData.pointDebutSaison || 0,
        pointsLicence: playerData.pointsLicence || 0,
        idLicence: playerData.idLicence || "",
        nomClub: playerData.nomClub || "",
        isHomme: playerData.isHomme || false,
      };

      // Si une licence est fournie, utiliser setDoc avec l'ID de la licence
      // Sinon, utiliser addDoc pour générer un ID automatique
      if (documentId) {
        const playerRef = doc(getDbInstanceDirect(), this.collectionName, documentId);
        await setDoc(playerRef, newPlayer);
        return documentId;
      } else {
        const playersRef = collection(getDbInstanceDirect(), this.collectionName);
        const docRef = await addDoc(playersRef, newPlayer);
        return docRef.id;
      }
    } catch (error) {
      console.error("Erreur lors de la création du joueur temporaire:", error);
      throw error;
    }
  }

  // Supprimer un joueur
  async deletePlayer(playerId: string): Promise<void> {
    try {
      const playerRef = doc(getDbInstanceDirect(), this.collectionName, playerId);
      await deleteDoc(playerRef);
    } catch (error) {
      console.error("Erreur lors de la suppression du joueur:", error);
      throw error;
    }
  }

  // Mettre à jour un joueur temporaire avec gestion des changements de clé
  async updateTemporaryPlayer(
    currentPlayerId: string,
    playerData: Omit<Player, "id" | "createdAt" | "updatedAt">
  ): Promise<{ newPlayerId: string; oldPlayerIdDeleted: boolean }> {
    try {
      // Récupérer les données actuelles du joueur
      const currentPlayerRef = doc(getDbInstanceDirect(), this.collectionName, currentPlayerId);
      const currentPlayerSnap = await getDoc(currentPlayerRef);
      
      if (!currentPlayerSnap.exists()) {
        throw new Error(`Joueur avec l'ID ${currentPlayerId} introuvable`);
      }

      const currentData = currentPlayerSnap.data();
      const currentLicense = currentData?.licence || "";
      const newLicense = playerData.license?.trim() || "";

      // Déterminer le nouvel ID du document
      // Si une licence est fournie, utiliser la licence comme ID
      // Sinon, on devra générer un nouvel ID (car on ne peut pas avoir un document sans ID)
      const newDocumentId = newLicense !== "" ? newLicense : undefined;

      // Déterminer si la clé doit changer
      // Cas 1: L'ancien ID était une licence et la nouvelle est différente (ou vide)
      // Cas 2: L'ancien ID était généré et une licence est ajoutée
      // Cas 3: L'ancien ID était une licence et elle est supprimée (nouvelle vide)
      const keyChanged = 
        (currentLicense !== newLicense) && // La licence a changé
        (currentPlayerId !== newDocumentId); // Et l'ID serait différent

      // Préparer les données mises à jour
      const updatedPlayer = {
        nom: playerData.name,
        prenom: playerData.firstName,
        licence: newLicense,
        typeLicence: playerData.typeLicence || "",
        sexe: playerData.gender,
        nationalite: playerData.nationality === "FR" ? "F" : playerData.nationality === "C" ? "C" : "ETR",
        isTemporary: true, // Reste temporaire
        preferredTeams: playerData.preferredTeams || currentData.preferredTeams || {
          masculine: [],
          feminine: [],
        },
        participation: playerData.participation || currentData.participation || {
          championnat: false,
        },
        hasPlayedAtLeastOneMatch: playerData.hasPlayedAtLeastOneMatch ?? currentData.hasPlayedAtLeastOneMatch ?? false,
        // Gérer discordMentions : inclure seulement si défini et non vide, sinon préserver la valeur existante
        ...(playerData.discordMentions !== undefined
          ? playerData.discordMentions.length > 0
            ? { discordMentions: playerData.discordMentions }
            : {} // Ne pas inclure si tableau vide (sera supprimé après)
          : { discordMentions: currentData.discordMentions }), // Préserver si non défini
        createdAt: currentData.createdAt || new Date(), // Préserver la date de création
        updatedAt: new Date(),
        // Champs additionnels
        numClub: playerData.numClub || currentData.numClub || "",
        club: playerData.club || currentData.club || "",
        classement: playerData.classement || currentData.classement || 0,
        points: playerData.points ?? currentData.points ?? 0,
        categorie: playerData.categorie || currentData.categorie || "",
        dateNaissance: playerData.dateNaissance || currentData.dateNaissance || "",
        lieuNaissance: playerData.lieuNaissance || currentData.lieuNaissance || "",
        datePremiereLicence: playerData.datePremiereLicence || currentData.datePremiereLicence || "",
        clubPrecedent: playerData.clubPrecedent || currentData.clubPrecedent || "",
        certificat: playerData.certificat ?? currentData.certificat ?? false,
        pointsMensuel: playerData.pointsMensuel || currentData.pointsMensuel || 0,
        pointsMensuelAnciens: playerData.pointsMensuelAnciens || currentData.pointsMensuelAnciens || 0,
        pointDebutSaison: playerData.pointDebutSaison || currentData.pointDebutSaison || 0,
        pointsLicence: playerData.pointsLicence || currentData.pointsLicence || 0,
        idLicence: playerData.idLicence || currentData.idLicence || "",
        nomClub: playerData.nomClub || currentData.nomClub || "",
        isHomme: playerData.isHomme ?? currentData.isHomme ?? false,
      };

      if (keyChanged) {
        // Si une nouvelle licence est fournie, vérifier qu'elle n'existe pas déjà
        if (newDocumentId && newDocumentId !== currentPlayerId) {
          const exists = await this.checkPlayerExists(newDocumentId);
          if (exists) {
            throw new Error(`Un joueur avec la licence ${newDocumentId} existe déjà. Un joueur temporaire ne peut pas correspondre à un joueur existant.`);
          }
        }

        // Créer le nouveau document avec la nouvelle clé
        if (newDocumentId) {
          const newPlayerRef = doc(getDbInstanceDirect(), this.collectionName, newDocumentId);
          await setDoc(newPlayerRef, updatedPlayer);
          
          // Si discordMentions était un tableau vide, supprimer le champ du nouveau document
          if (playerData.discordMentions !== undefined && playerData.discordMentions.length === 0) {
            await updateDoc(newPlayerRef, {
              discordMentions: deleteField(),
            });
          }
        } else {
          // Pas de licence : générer un nouvel ID
          const playersRef = collection(getDbInstanceDirect(), this.collectionName);
          const docRef = await addDoc(playersRef, updatedPlayer);
          
          // Si discordMentions était un tableau vide, supprimer le champ du nouveau document
          if (playerData.discordMentions !== undefined && playerData.discordMentions.length === 0) {
            await updateDoc(docRef, {
              discordMentions: deleteField(),
            });
          }
          
          await this.deletePlayer(currentPlayerId);
          return { newPlayerId: docRef.id, oldPlayerIdDeleted: true };
        }

        // Supprimer l'ancien document
        await this.deletePlayer(currentPlayerId);
        return { newPlayerId: newDocumentId, oldPlayerIdDeleted: true };
      } else {
        // Pas de changement de clé, juste mettre à jour
        await updateDoc(currentPlayerRef, updatedPlayer);
        
        // Si discordMentions était un tableau vide, supprimer le champ
        if (playerData.discordMentions !== undefined && playerData.discordMentions.length === 0) {
          await updateDoc(currentPlayerRef, {
            discordMentions: deleteField(),
          });
        }
        
        return { newPlayerId: currentPlayerId, oldPlayerIdDeleted: false };
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du joueur temporaire:", error);
      throw error;
    }
  }
}
