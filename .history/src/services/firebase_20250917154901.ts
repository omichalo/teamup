import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Player,
  Team,
  Match,
  Composition,
  Availability,
  BurnRecord,
  ClubSettings,
  User,
} from "@/types";

// Helper function to convert Firestore timestamps to Date objects
const convertTimestamps = (data: DocumentData): any => {
  const converted = { ...data };
  Object.keys(converted).forEach((key) => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

// Players Collection
export const playersCollection = collection(db, "players");

export const getPlayers = async (): Promise<Player[]> => {
  const snapshot = await getDocs(query(playersCollection, orderBy("lastName")));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Player[];
};

export const getPlayer = async (id: string): Promise<Player | null> => {
  const docRef = doc(playersCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as Player;
  }
  return null;
};

export const addPlayer = async (
  player: Omit<Player, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(playersCollection, {
    ...player,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const updatePlayer = async (
  id: string,
  updates: Partial<Player>
): Promise<void> => {
  const docRef = doc(playersCollection, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const deletePlayer = async (id: string): Promise<void> => {
  const docRef = doc(playersCollection, id);
  await deleteDoc(docRef);
};

// Teams Collection
export const teamsCollection = collection(db, "teams");

export const getTeams = async (): Promise<Team[]> => {
  const snapshot = await getDocs(query(teamsCollection, orderBy("number")));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Team[];
};

export const getTeam = async (id: string): Promise<Team | null> => {
  const docRef = doc(teamsCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as Team;
  }
  return null;
};

export const addTeam = async (
  team: Omit<Team, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(teamsCollection, {
    ...team,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const updateTeam = async (
  id: string,
  updates: Partial<Team>
): Promise<void> => {
  const docRef = doc(teamsCollection, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

// Matches Collection
export const matchesCollection = collection(db, "matches");

export const getMatches = async (): Promise<Match[]> => {
  const snapshot = await getDocs(query(matchesCollection, orderBy("date")));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Match[];
};

export const getMatchesByTeam = async (
  teamNumber: number
): Promise<Match[]> => {
  const q = query(
    matchesCollection,
    where("teamNumber", "==", teamNumber),
    orderBy("date")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Match[];
};

export const getUpcomingMatches = async (
  limitCount: number = 5
): Promise<Match[]> => {
  const now = new Date();
  const q = query(
    matchesCollection,
    where("date", ">=", Timestamp.fromDate(now)),
    orderBy("date"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Match[];
};

export const addMatch = async (
  match: Omit<Match, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(matchesCollection, {
    ...match,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const updateMatch = async (
  id: string,
  updates: Partial<Match>
): Promise<void> => {
  const docRef = doc(matchesCollection, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

// Compositions Collection
export const compositionsCollection = collection(db, "compositions");

export const getCompositions = async (): Promise<Composition[]> => {
  const snapshot = await getDocs(
    query(compositionsCollection, orderBy("createdAt", "desc"))
  );
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Composition[];
};

export const getCompositionByMatch = async (
  matchId: string
): Promise<Composition | null> => {
  const q = query(compositionsCollection, where("matchId", "==", matchId));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...convertTimestamps(doc.data()),
    } as Composition;
  }
  return null;
};

export const addComposition = async (
  composition: Omit<Composition, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(compositionsCollection, {
    ...composition,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const updateComposition = async (
  id: string,
  updates: Partial<Composition>
): Promise<void> => {
  const docRef = doc(compositionsCollection, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

// Availabilities Collection
export const availabilitiesCollection = collection(db, "availabilities");

export const getAvailabilities = async (): Promise<Availability[]> => {
  const snapshot = await getDocs(availabilitiesCollection);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Availability[];
};

export const getAvailabilitiesByJournee = async (
  journee: number
): Promise<Availability[]> => {
  const q = query(availabilitiesCollection, where("journee", "==", journee));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Availability[];
};

export const addAvailability = async (
  availability: Omit<Availability, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(availabilitiesCollection, {
    ...availability,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const updateAvailability = async (
  id: string,
  updates: Partial<Availability>
): Promise<void> => {
  const docRef = doc(availabilitiesCollection, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

// Burn Records Collection
export const burnRecordsCollection = collection(db, "burnRecords");

export const getBurnRecords = async (): Promise<BurnRecord[]> => {
  const snapshot = await getDocs(burnRecordsCollection);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as BurnRecord[];
};

export const getBurnRecordsByPlayer = async (
  playerId: string
): Promise<BurnRecord[]> => {
  const q = query(burnRecordsCollection, where("playerId", "==", playerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as BurnRecord[];
};

export const addBurnRecord = async (
  burnRecord: Omit<BurnRecord, "id" | "createdAt">
): Promise<string> => {
  const docRef = await addDoc(burnRecordsCollection, {
    ...burnRecord,
    createdAt: Timestamp.fromDate(new Date()),
  });
  return docRef.id;
};

// Club Settings Collection
export const clubSettingsCollection = collection(db, "clubSettings");

export const getClubSettings = async (): Promise<ClubSettings | null> => {
  const snapshot = await getDocs(clubSettingsCollection);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...convertTimestamps(doc.data()),
    } as ClubSettings;
  }
  return null;
};

export const updateClubSettings = async (
  updates: Partial<ClubSettings>
): Promise<void> => {
  const snapshot = await getDocs(clubSettingsCollection);
  if (!snapshot.empty) {
    const docRef = doc(clubSettingsCollection, snapshot.docs[0].id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } else {
    // Create new settings if none exist
    const now = new Date();
    await addDoc(clubSettingsCollection, {
      ...updates,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
  }
};

// Users Collection
export const usersCollection = collection(db, "users");

export const getUser = async (id: string): Promise<User | null> => {
  const docRef = doc(usersCollection, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as User;
  }
  return null;
};

export const addUser = async (
  user: Omit<User, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const now = new Date();

  // Filtrer les champs undefined pour éviter les erreurs Firebase
  const cleanUser = Object.fromEntries(
    Object.entries(user).filter(([_, value]) => value !== undefined)
  );

  const docRef = await addDoc(usersCollection, {
    ...cleanUser,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const updateUser = async (
  id: string,
  updates: Partial<User>
): Promise<void> => {
  const docRef = doc(usersCollection, id);

  // Filtrer les champs undefined pour éviter les erreurs Firebase
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );

  await updateDoc(docRef, {
    ...cleanUpdates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};
