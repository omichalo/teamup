import type {
  FFTTRencontre,
  FFTTDetailsRencontre,
  FFTTJoueur,
} from "./fftt-types";

/**
 * Conversions défensives des payloads bruts renvoyés par l’API FFTT (formes variables).
 */
export function convertToFFTTRencontre(rencontre: unknown): FFTTRencontre {
  const r = rencontre as Record<string, unknown>;
  return {
    nomEquipeA: String(r.nomEquipeA || ""),
    nomEquipeB: String(r.nomEquipeB || ""),
    scoreEquipeA: typeof r.scoreEquipeA === "number" ? r.scoreEquipeA : null,
    scoreEquipeB: typeof r.scoreEquipeB === "number" ? r.scoreEquipeB : null,
    lien: String(r.lien || ""),
    ...(r.libelle ? { libelle: String(r.libelle) } : {}),
    ...(r.dateReelle instanceof Date ? { dateReelle: r.dateReelle } : {}),
    ...(r.datePrevue instanceof Date ? { datePrevue: r.datePrevue } : {}),
  };
}

export function convertToFFTTJoueur(joueur: unknown): FFTTJoueur {
  const j = joueur as Record<string, unknown>;
  return {
    licence: String(j.licence || ""),
    nom: String(j.nom || ""),
    prenom: String(j.prenom || ""),
    points: typeof j.points === "number" ? j.points : null,
    sexe: j.sexe ? String(j.sexe) : "M",
    ...(j.club ? { club: String(j.club) } : {}),
  };
}

function convertToPartie(partie: unknown): {
  adversaireA: string;
  adversaireB: string;
  scoreA: number;
  scoreB: number;
  setDetails: string;
} {
  const p = partie as Record<string, unknown>;
  return {
    adversaireA: String(p.adversaireA || ""),
    adversaireB: String(p.adversaireB || ""),
    scoreA: typeof p.scoreA === "number" ? p.scoreA : 0,
    scoreB: typeof p.scoreB === "number" ? p.scoreB : 0,
    setDetails: String(p.setDetails || ""),
  };
}

export function convertToFFTTDetailsRencontre(details: unknown): FFTTDetailsRencontre {
  const d = details as Record<string, unknown>;

  let joueursA: FFTTJoueur[] = [];
  if (d.joueursA) {
    if (Array.isArray(d.joueursA)) {
      joueursA = d.joueursA.map(convertToFFTTJoueur);
    } else if (typeof d.joueursA === "object" && d.joueursA !== null) {
      joueursA = Object.values(d.joueursA).map(convertToFFTTJoueur);
    }
  }

  let joueursB: FFTTJoueur[] = [];
  if (d.joueursB) {
    if (Array.isArray(d.joueursB)) {
      joueursB = d.joueursB.map(convertToFFTTJoueur);
    } else if (typeof d.joueursB === "object" && d.joueursB !== null) {
      joueursB = Object.values(d.joueursB).map(convertToFFTTJoueur);
    }
  }

  return {
    nomEquipeA: String(d.nomEquipeA || ""),
    nomEquipeB: String(d.nomEquipeB || ""),
    joueursA,
    joueursB,
    parties: Array.isArray(d.parties) ? d.parties.map(convertToPartie) : [],
    ...(typeof d.expectedScoreEquipeA === "number" && {
      expectedScoreEquipeA: d.expectedScoreEquipeA,
    }),
    ...(typeof d.expectedScoreEquipeB === "number" && {
      expectedScoreEquipeB: d.expectedScoreEquipeB,
    }),
    ...(typeof d.scoreEquipeA === "number" || d.scoreEquipeA === null
      ? { scoreEquipeA: d.scoreEquipeA }
      : {}),
    ...(typeof d.scoreEquipeB === "number" || d.scoreEquipeB === null
      ? { scoreEquipeB: d.scoreEquipeB }
      : {}),
  };
}
