/**
 * Données de référence pour le formulaire d'inscription au club (aligné sur le formulaire public SQY PING).
 * Les créneaux et sections peuvent être ajustés ici sans toucher à la logique métier.
 */

import {
  COMPETITIONS_JEUNES_ID,
  YOUTH_COMPETITION_FORM_IDS,
} from "./competition-ids";

export type ClubRegistrationSiteSlot = {
  id: string;
  label: string;
  /** École desservie par le dispositif de récupération (sqyping.fr). */
  schoolPickupSchool?: string;
};

export type ClubRegistrationSite = {
  /**
   * Identifiant du lieu / groupe de créneaux ; doit correspondre à l’id de section principale
   * (`mainSectionId`) quand ce lieu représente la section (matching pour ouverture auto, refs Firebase).
   */
  id: string;
  label: string;
  /** Nom du gymnase ou de la salle (affiché sous le lieu dans le formulaire). */
  gymnasiumName?: string;
  slots: ClubRegistrationSiteSlot[];
};

/** Sections « principale / autres » (liste du formulaire papier / Webflow). */
export const SECTION_PRINCIPALE_OPTIONS = [
  { id: "voisins", label: "Voisins-le-Bretonneux" },
  { id: "villepreux", label: "Villepreux" },
  { id: "guyancourt", label: "Guyancourt" },
  { id: "magny", label: "Magny-les-Hameaux" },
  { id: "la-verriere", label: "La Verrière" },
  { id: "trappes", label: "Trappes" },
  { id: "handisport", label: "Section handisport" },
  { id: "sport-adapte", label: "Section sport adapté" },
] as const;

/** Créneaux proposés par lieu (alignés sur sqyping.fr/creneaux-par-gymnase, hors Académie). */
export const CLUB_REGISTRATION_SITES: ClubRegistrationSite[] = [
  {
    id: "voisins",
    label: "Voisins-le-Bretonneux",
    slots: [
      {
        id: "voisins-lun-1730-jeunes-loisirs",
        label: "Lundi / 17h00 – 18h30 / Jeunes Loisirs",
        schoolPickupSchool: "École des Pépinières",
      },
      { id: "voisins-mar-1500-section-sportive", label: "Mardi / 15h00 – 17h00 / Section Sportive" },
      {
        id: "voisins-mar-1730-jeunes-loisirs",
        label: "Mardi / 17h00 – 18h30 / Jeunes Loisirs",
        schoolPickupSchool: "École des Pépinières",
      },
      { id: "voisins-mar-1830-handisport", label: "Mardi / 18h30 – 20h00 / Handisport" },
      { id: "voisins-mar-2030-adultes-compet", label: "Mardi / 20h30 – 22h30 / Adultes Compétiteurs" },
      { id: "voisins-mar-2030-adultes-loisirs", label: "Mardi / 20h30 – 22h30 / Adultes Loisirs" },
      { id: "voisins-mer-1400-jeunes-loisirs", label: "Mercredi / 14h00 – 15h30 / Jeunes Loisirs" },
      { id: "voisins-mer-1530-jeunes-compet", label: "Mercredi / 15h30 – 17h00 / Jeunes Compétiteurs" },
      { id: "voisins-mer-1700-jeunes-elites", label: "Mercredi / 17h00 – 19h00 / Jeunes Élites (sélection)" },
      {
        id: "voisins-jeu-1700-jeunes-loisir-compet",
        label: "Jeudi / 17h00 – 19h00 / Jeunes loisir et compétiteurs",
        schoolPickupSchool: "École des Pépinières",
      },
      { id: "voisins-jeu-1900-adultes-elite", label: "Jeudi / 19h00 – 20h45 / Adultes Élite (sélection)" },
      { id: "voisins-jeu-2045-adultes-compet", label: "Jeudi / 20h45 – 22h30 / Adultes Compétiteurs" },
      { id: "voisins-ven-1500-section-sportive", label: "Vendredi / 15h00 – 18h00 / Jeunes Section Sportive" },
      { id: "voisins-sam-1000-tous-publics", label: "Samedi / 10h00 – 12h00 / Tous publics" },
      { id: "voisins-dim-1000-libre", label: "Dimanche / 10h00 – 12h00 / Libre" },
    ],
  },
  {
    id: "villepreux",
    label: "Villepreux",
    slots: [
      {
        id: "villepreux-lun-1730-jeunes-loisirs",
        label: "Lundi / 17h00 – 18h30 / Jeunes Loisirs",
        schoolPickupSchool: "École Jean Rostand",
      },
      { id: "villepreux-lun-1830-competiteurs", label: "Lundi / 18h30 – 20h00 / Compétiteurs" },
      { id: "villepreux-lun-2030-adultes", label: "Lundi / 20h30 – 22h30 / Adultes" },
      { id: "villepreux-mar-2030-libre", label: "Mardi / 20h30 – 22h30 / Libre" },
      { id: "villepreux-mer-1400-jeunes-loisirs", label: "Mercredi / 14h00 – 15h30 / Jeunes Loisirs" },
      { id: "villepreux-mer-1530-competiteurs", label: "Mercredi / 15h30 – 17h00 / Compétiteurs" },
      { id: "villepreux-mer-1700-jeunes-elites", label: "Mercredi / 17h00 – 19h00 / Jeunes Élites (sélection)" },
      { id: "villepreux-mer-2030-competiteurs", label: "Mercredi / 20h30 – 22h30 / Compétiteurs" },
      { id: "villepreux-jeu-1030-sport-adapte", label: "Jeudi / 10h30 – 12h00 / Sport Adapté" },
      {
        id: "villepreux-ven-1700-jeunes-loisirs",
        label: "Vendredi / 17h00 – 18h30 / Jeunes Loisirs",
        schoolPickupSchool: "École Jean Rostand",
      },
      { id: "villepreux-ven-1830-jeunes-compet", label: "Vendredi / 18h30 – 20h00 / Jeunes Compétiteurs" },
      { id: "villepreux-sam-1000-tous-publics", label: "Samedi / 10h00 – 12h00 / Tous publics" },
      { id: "villepreux-dim-1030-libre", label: "Dimanche / 10h30 – 12h00 / Libre" },
    ],
  },
  {
    id: "guyancourt",
    label: "Guyancourt",
    slots: [
      { id: "guy-lun-1730-jeunes-loisir-compet", label: "Lundi / 17h30 – 19h00 / Jeunes loisirs et compétiteurs" },
      { id: "guy-lun-1930-adultes-loisirs", label: "Lundi / 19h30 – 22h30 / Adultes Loisirs" },
      { id: "guy-mar-1730-jeunes-loisir-compet", label: "Mardi / 17h30 – 19h30 / Jeunes Loisirs et compétiteurs" },
      { id: "guy-mar-2000-adultes-compet", label: "Mardi / 20h00 – 22h00 / Adultes Compétiteurs" },
      { id: "guy-mer-1600-jeunes-loisir-compet", label: "Mercredi / 16h00 – 17h30 / Jeunes Loisirs et compétiteurs" },
      { id: "guy-mer-1800-libre", label: "Mercredi / 18h00 – 22h00 / Libre" },
      { id: "guy-jeu-1800-libre", label: "Jeudi / 18h00 – 22h00 / Libre" },
      { id: "guy-ven-1800-jeunes-compet", label: "Vendredi / 18h00 – 20h00 / Jeunes compétiteurs" },
      { id: "guy-dim-0930-libre", label: "Dimanche / 9h30 – 12h00 / Libre" },
    ],
  },
  {
    id: "la-verriere",
    label: "La Verrière",
    slots: [
      { id: "lv-jeu-1800-jeunes-loisirs", label: "Jeudi / 18h00 – 19h30 / Jeunes Loisirs" },
    ],
  },
  {
    id: "vaucresson",
    label: "Vaucresson",
    slots: [
      { id: "vau-lun-1900-handisport", label: "Lundi / 19h00 – 20h30 / Handisport" },
      { id: "vau-jeu-1730-handisport", label: "Jeudi / 17h00 – 18h30 / Handisport" },
    ],
  },
  {
    id: "trappes",
    label: "Trappes",
    slots: [
      {
        id: "trappes-mer-1730-jeunes-loisir-compet",
        label: "Mercredi / 17h30 – 19h30 / Jeunes Loisirs et compétiteurs",
      },
    ],
  },
  {
    id: "magny",
    label: "Magny-les-Hameaux",
    slots: [
      { id: "magny-mer-1800-jeunes-loisir-compet", label: "Mercredi / 18h00 – 19h30 / Jeunes loisirs et compétiteurs" },
      { id: "magny-mer-2000-adultes-loisir-compet", label: "Mercredi / 20h00 – 22h00 / Adultes loisirs et compétiteurs" },
      { id: "magny-ven-1830-tous-publics", label: "Vendredi / 18h30 – 20h00 / Tous publics" },
    ],
  },
];

/** Identifiants valides pour les créneaux (pour validation côté serveur). */
export const ALL_SLOT_IDS: ReadonlySet<string> = new Set(
  CLUB_REGISTRATION_SITES.flatMap((s) => s.slots.map((sl) => sl.id))
);

/** Compétitions jeunes — sélectionnables indépendamment, forfait unique à la facturation. */
export const YOUTH_COMPETITION_OPTIONS = [
  { id: YOUTH_COMPETITION_FORM_IDS[0], label: "Championnat des jeunes" },
  { id: YOUTH_COMPETITION_FORM_IDS[1], label: "Critérium fédéral jeunes" },
] as const;

/** Autres compétitions (tarif par option). */
export const OTHER_COMPETITION_OPTIONS = [
  { id: "criterium_federal_seniors", label: "Critérium fédéral seniors (42 €)" },
  { id: "championnat_equipe", label: "Championnat par équipes (25 €)" },
  { id: "championnat_paris", label: "Championnat de Paris (15 €)" },
  {
    id: "competition_handisport",
    label: "Compétition handisport (0 € — paiement à chaque compétition)",
  },
] as const;

/** Options affichées dans le formulaire (alignées sur sqyping.fr/tarifs). */
export const COMPETITION_OPTIONS = [
  ...YOUTH_COMPETITION_OPTIONS,
  ...OTHER_COMPETITION_OPTIONS,
] as const;

/** Valeurs acceptées en base / API (inclut l’id de facturation jeunes historique). */
export const COMPETITION_ID_VALUES = [
  ...YOUTH_COMPETITION_FORM_IDS,
  COMPETITIONS_JEUNES_ID,
  "criterium_federal_seniors",
  "championnat_equipe",
  "championnat_paris",
  "competition_handisport",
] as const;

export const JERSEY_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"] as const;

/** Pratique handisport (grille tarifaire distincte loisirs / compétition). */
export const HANDISPORT_PRACTICE_OPTIONS = [
  { id: "leisure", label: "Loisirs" },
  { id: "competition", label: "Compétition" },
] as const;

export const REDUCTION_OPTIONS = [
  { id: "pass_plus", label: "Pass Plus" },
  { id: "pass_sport", label: "Pass Sport" },
  { id: "labaz", label: "Labaz" },
  { id: "aide_municipale", label: "Aide municipale" },
] as const;

/** Liens officiels (questionnaires, communication club). */
export const CLUB_REGISTRATION_EXTERNAL_LINKS = {
  questionnaireMajeur:
    "https://cdn.prod.website-files.com/66e06edc471d4cd7cfe7d477/683f5edfa870f40a5e55c621_25-10-1-autoquestionnaire-medical-majeur.pdf",
  questionnaireMineur:
    "https://cdn.prod.website-files.com/66e06edc471d4cd7cfe7d477/683f5e0a8729cf962d616d7f_25-10-2-autoquestionnaire-medical-mineur.pdf",
  siteClub: "https://www.sqyping.fr",
  reglementInterieur:
    "https://sqyping-my.sharepoint.com/:b:/r/personal/salome_nizan_sqyping_onmicrosoft_com/Documents/Voisins%20TT/Bureau%20-%20Administratif/Docs%20officiels%20club/R%C3%A8glement%20Int%C3%A9rieur/R%C3%A8glement%20Int%C3%A9rieur%20SQY%20PING%202019.pdf?csf=1&web=1&e=dbwOno",
} as const;
