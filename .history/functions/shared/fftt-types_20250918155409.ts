// Types partagés entre Cloud Functions et API Routes

export interface FFTTEquipe {
  libelle: string;
  division: string;
  lienDivision: string;
  idEquipe: number;
  idEpreuve: number;
  libelleEpreuve: string;
}

export interface FFTTJoueur {
  licence: string;
  nom: string;
  prenom: string;
  points: number | null | undefined;
  sexe?: string;
  club?: string;
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
}
