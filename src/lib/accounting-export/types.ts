export type SagePartyContext = {
  registrationId: string;
  adherentName: string;
  seasonLabel: string;
};

export type SageEntryLine = {
  journal: string;
  /** JJ/MM/AAAA, fuseau Europe/Paris. */
  date: string;
  /** AAAAMMJJ, pour le tri. */
  sortDate: string;
  piece: string;
  account: string;
  auxiliary: string;
  label: string;
  debitCents: number;
  creditCents: number;
  teamupDocumentNumber: string;
  registrationId: string;
  adherentName: string;
  seasonLabel: string;
};

export type SageAnomalySeverity = "blocking" | "review" | "pending" | "info";

export type SageExportAnomaly = {
  registrationId: string;
  adherentName: string;
  seasonLabel: string;
  code: string;
  severity: SageAnomalySeverity;
  message: string;
  documentNumber: string;
  amountCents: number | null;
};

export type SageThirdParty = {
  code: string;
  /** Licence FFTT absente (attribut) — le code auxiliaire reste valide. */
  licenseMissing: boolean;
  lastName: string;
  firstName: string;
  license: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  email: string;
  registrationId: string;
  seasonLabel: string;
};

export type RegistrationSageExport = {
  lines: SageEntryLine[];
  anomalies: SageExportAnomaly[];
  thirdParty: SageThirdParty | null;
};

export type SignedAccountSplit = {
  account: string;
  /** Positif = produit (crédit). Négatif = diminution de produit (débit). */
  signedCents: number;
};
