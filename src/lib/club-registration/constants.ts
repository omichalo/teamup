/**
 * Données de référence pour le formulaire d'inscription au club (aligné sur le formulaire public SQY PING).
 * Les créneaux et sections peuvent être ajustés ici sans toucher à la logique métier.
 */

export type ClubRegistrationSiteSlot = {
  id: string;
  label: string;
};

export type ClubRegistrationSite = {
  /**
   * Identifiant du lieu / groupe de créneaux ; doit correspondre à l’id de section principale
   * (`mainSectionId`) quand ce lieu représente la section (matching pour ouverture auto, refs Firebase).
   */
  id: string;
  label: string;
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

/** Créneaux proposés par lieu (cases à cocher). */
export const CLUB_REGISTRATION_SITES: ClubRegistrationSite[] = [
  {
    id: "voisins",
    label: "Voisins-le-Bretonneux",
    slots: [
      { id: "voisins-lun-1730-jeunes-loisirs", label: "Lundi / 17h00 - 18h30 / Jeunes Loisirs" },
      { id: "voisins-mar-1500-section-sportive", label: "Mardi / 15h00 - 17h00 / Section Sportive" },
      { id: "voisins-mar-1830-handisport", label: "Mardi / 18h30 – 20h00 / Handisport" },
      { id: "voisins-mar-1830-academie", label: "Mardi / 18h30 – 20h00 / Académie" },
      { id: "voisins-mar-2030-adultes-compet", label: "Mardi / 20h30 – 22h30 / Adultes Compétiteurs" },
      { id: "voisins-mar-2030-adultes-loisirs", label: "Mardi / 20h30 – 22h30 / Adultes Loisirs" },
      { id: "voisins-mer-1300-individuel", label: "Mercredi / 13h00 – 14h00 / Individuel" },
      { id: "voisins-mer-1400-jeunes-loisirs", label: "Mercredi / 14h00 – 15h30 / Jeunes Loisirs" },
      { id: "voisins-mer-1530-jeunes-compet", label: "Mercredi / 15h30 – 17h00 / Jeunes Compétiteurs" },
      { id: "voisins-mer-1700-jeunes-elites", label: "Mercredi / 17h00 – 19h00 / Jeunes Élites (sélection)" },
      { id: "voisins-jeu-1700-jeunes", label: "Jeudi / 17h00 – 19h00 / Jeunes" },
      { id: "voisins-jeu-1700-jeunes-elites", label: "Jeudi / 17h00 – 19h00 / Jeunes Élites (sélection)" },
      { id: "voisins-jeu-1700-academie-handisport", label: "Jeudi / 17h00 – 19h00 / Académie Handisport" },
      { id: "voisins-jeu-1900-adultes-elite", label: "Jeudi / 19h00 – 20h45 / Adultes Élite (sélection)" },
      { id: "voisins-ven-1500-section-sportive", label: "Vendredi / 15h00 – 18h00 / Section Sportive" },
      { id: "voisins-sam-1000-tous-publics", label: "Samedi / 10h00 – 12h00 / Tous publics" },
    ],
  },
  {
    id: "villepreux",
    label: "Villepreux",
    slots: [
      { id: "villepreux-lun-1730-jeunes-loisirs", label: "Lundi / 17h00 - 18h30 / Jeunes Loisirs" },
      { id: "villepreux-lun-1830-competiteurs", label: "Lundi / 18h30 - 20h00 / Compétiteurs" },
      { id: "villepreux-lun-2030-adultes", label: "Lundi / 20h30 - 22h30 / Adultes" },
      { id: "villepreux-mer-1400-jeunes-loisirs", label: "Mercredi / 14h00 – 15h30 / Jeunes Loisirs" },
      { id: "villepreux-mer-1530-competiteurs", label: "Mercredi / 15h30 – 17h00 / Compétiteurs" },
      { id: "villepreux-mer-1700-jeunes-elites", label: "Mercredi / 17h00 – 19h00 / Jeunes Élites (sélection)" },
      { id: "villepreux-mer-2030-competiteurs", label: "Mercredi / 20h30 – 22h30 / Compétiteurs" },
      { id: "villepreux-jeu-1030-sport-adapte", label: "Jeudi / 10h30 – 12h00 / Sport Adapté" },
      { id: "villepreux-ven-1700-jeunes-loisirs", label: "Vendredi / 17h00 – 18h30 / Jeunes Loisirs" },
      { id: "villepreux-ven-1830-jeunes-compet", label: "Vendredi / 18h30 – 20h00 / Jeunes Compétiteurs" },
      { id: "villepreux-sam-1000-tous-publics", label: "Samedi / 10h00 – 12h00 / Tous publics" },
    ],
  },
  {
    id: "guyancourt",
    label: "Guyancourt",
    slots: [
      { id: "guy-lun-1730-jeunes", label: "Lundi / 17h30 – 19h00 / Jeunes" },
      { id: "guy-lun-1900-adultes-loisirs", label: "Lundi / 19h00 – 22h00 / Adultes Loisirs" },
      { id: "guy-mar-1730-jeunes-loisirs-compet", label: "Mardi / 17h30 – 19h30 / Jeunes Loisirs et compétitions" },
      { id: "guy-mar-2000-adultes-compet", label: "Mardi / 20h00 – 22h00 / Adultes Compétiteurs" },
      { id: "guy-mer-1300-academie", label: "Mercredi / 13h00 – 17h00 / Académie" },
      { id: "guy-mer-1600-jeunes-loisirs", label: "Mercredi / 16h00 – 17h30 / Jeunes Loisirs" },
      { id: "guy-mer-1730-academie-handisport", label: "Mercredi / 17h30 – 19h30 / Académie Handisport" },
      { id: "guy-ven-1800-jeunes-loisirs", label: "Vendredi / 18h00 – 20h00 / Jeunes Loisirs" },
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
      { id: "trappes-mer-1730-jeunes-loisirs", label: "Mercredi / 17h30 – 19h30 / Jeunes Loisirs" },
    ],
  },
  {
    id: "magny",
    label: "Magny-les-Hameaux",
    slots: [
      { id: "magny-mer-1800-jeunes", label: "Mercredi / 18h00 – 19h30 / Jeunes" },
      { id: "magny-mer-2000-adultes", label: "Mercredi / 20h00 – 22h00 / Adultes" },
      { id: "magny-jeu-1000-academie-handisport", label: "Jeudi / 10h00 – 12h00 / Académie handisport" },
      { id: "magny-jeu-1300-academie-handisport", label: "Jeudi / 13h00 – 15h00 / Académie handisport" },
      { id: "magny-ven-1830-tous-publics", label: "Vendredi / 18h30 – 20h00 / Tous publics" },
    ],
  },
];

/** Identifiants valides pour les créneaux (pour validation côté serveur). */
export const ALL_SLOT_IDS: ReadonlySet<string> = new Set(
  CLUB_REGISTRATION_SITES.flatMap((s) => s.slots.map((sl) => sl.id))
);

/** Compétitions optionnelles (bloc compétiteur). */
export const COMPETITION_OPTIONS = [
  {
    id: "championnat_jeunes",
    label: "Championnat des jeunes (25 € pouvant comprendre le critérium fédéral jeunes)",
  },
  {
    id: "criterium_federal_jeunes",
    label: "Critérium fédéral Jeunes (25 € pouvant comprendre le championnat des jeunes)",
  },
  { id: "championnat_equipe", label: "Championnat par équipe (25 €)" },
  { id: "criterium_federal_seniors", label: "Critérium fédéral Seniors (42 €)" },
  { id: "championnat_paris", label: "Championnat de Paris (15 €)" },
  {
    id: "competition_handisport",
    label: "Compétition handisport (0 € — paiement à chaque compétition)",
  },
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
