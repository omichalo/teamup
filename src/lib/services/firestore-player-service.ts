import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Player } from "@/types/team-management";

export class FirestorePlayerService {
  private readonly collectionName = "players";

  // Convertir les données Firestore vers le format Player
  private convertFirestoreToPlayer(doc: any): Player {
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
      console.log("🔍 Récupération de tous les joueurs...");
      const playersRef = collection(db, this.collectionName);
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

      console.log(`✅ ${players.length} joueurs récupérés`);
      return players;
    } catch (error) {
      console.error("Erreur lors de la récupération des joueurs:", error);
      throw error;
    }
  }

  async getActivePlayers(): Promise<Player[]> {
    try {
      console.log("🔍 Récupération des joueurs actifs...");
      // Récupérer tous les joueurs et filtrer côté client
      // car on ne peut pas filtrer sur un champ calculé
      const allPlayers = await this.getAllPlayers();
      const activePlayers = allPlayers.filter((player) => player.isActive);

      console.log(
        `✅ ${activePlayers.length} joueurs actifs trouvés sur ${allPlayers.length} total`
      );
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
      const playerRef = doc(db, this.collectionName, playerId);
      await updateDoc(playerRef, updates);
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
      const playerRef = doc(db, this.collectionName, playerId);
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
      console.log("🔍 Récupération des joueurs sans licence...");
      const allPlayers = await this.getAllPlayers();
      const playersWithoutLicense = allPlayers.filter(
        (player) => !player.isActive && !player.isTemporary
      );

      console.log(
        `✅ ${playersWithoutLicense.length} joueurs sans licence trouvés`
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
      console.log("🔍 Récupération des joueurs temporaires...");
      const allPlayers = await this.getAllPlayers();
      const temporaryPlayers = allPlayers.filter(
        (player) => player.isTemporary
      );

      console.log(`✅ ${temporaryPlayers.length} joueurs temporaires trouvés`);
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

  // Créer un joueur temporaire
  async createTemporaryPlayer(
    playerData: Omit<Player, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      console.log("🔍 Création d&apos;un joueur temporaire...");
      const playersRef = collection(db, this.collectionName);

      const newPlayer = {
        nom: playerData.name,
        prenom: playerData.firstName,
        licence: playerData.license || "",
        sexe: playerData.gender,
        nationalite: playerData.nationality,
        isTemporary: true,
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

      const docRef = await addDoc(playersRef, newPlayer);
      console.log(`✅ Joueur temporaire créé avec l&apos;ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de la création du joueur temporaire:", error);
      throw error;
    }
  }
}
