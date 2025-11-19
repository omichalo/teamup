// Types partagés entre Cloud Functions et API Routes

export interface FFTTEquipe {
  libelle: string;
  division: string;
  lienDivision: string;
  idEquipe: number;
  idEpreuve: number;
  libelleEpreuve: string;
  isFemale?: boolean; // Indique si c'est une équipe féminine (peut être défini par l'API ou calculé)
}

export interface FFTTJoueur {
  licence: string;
  nom: string;
  prenom: string;
  points: number | null | undefined;
  sexe?: string;
  club?: string;
}

export interface FFTTJoueurDetails {
  licence: string;
  nom: string;
  prenom: string;
  points: number | null | undefined;
  sexe?: string;
  club?: string;
  // Données enrichies
  classement?: string;
  categorie?: string;
  nationalite?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  datePremiereLicence?: string;
  clubPrecedent?: string;
  // Autres champs disponibles dans getJoueurDetailsByLicence
  [key: string]: unknown;
}

export interface FFTTRencontre {
  nomEquipeA: string;
  nomEquipeB: string;
  scoreEquipeA: number | null;
  scoreEquipeB: number | null;
  lien: string;
  libelle?: string;
  dateReelle?: Date;
  datePrevue?: Date;
}

export interface FFTTDetailsRencontre {
  nomEquipeA: string;
  nomEquipeB: string;
  joueursA: FFTTJoueur[];
  joueursB: FFTTJoueur[];
  parties: Array<{
    adversaireA: string;
    adversaireB: string;
    scoreA: number;
    scoreB: number;
    setDetails: string;
  }>;
  expectedScoreEquipeA?: number;
  expectedScoreEquipeB?: number;
  scoreEquipeA?: number | null; // Peut être présent dans certains cas
  scoreEquipeB?: number | null; // Peut être présent dans certains cas
}
