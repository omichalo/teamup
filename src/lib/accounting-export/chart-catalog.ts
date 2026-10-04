import { SAGE_ACCOUNTS, SAGE_JOURNALS } from "./chart";

export type SageChartJournalRow = {
  code: string;
  usage: string;
};

export type SageChartAccountRow = {
  account: string;
  label: string;
  usualSense: string;
};

/** Journaux proposés pour l'export Sage (affichage secrétariat, 2 car. pour XImport). */
export const SAGE_CHART_JOURNALS: readonly SageChartJournalRow[] = [
  { code: SAGE_JOURNALS.sales, usage: "Factures, compléments, avoirs" },
  {
    code: SAGE_JOURNALS.bank,
    usage: "Carte Stripe, SumUp, virement, chèque, chèques vacances, autre",
  },
  { code: SAGE_JOURNALS.cash, usage: "Espèces" },
  { code: SAGE_JOURNALS.general, usage: "Aides reçues" },
];

/** Plan de comptes proposé pour l'export Sage (affichage secrétariat). */
export const SAGE_CHART_ACCOUNTS: readonly SageChartAccountRow[] = [
  {
    account: SAGE_ACCOUNTS.client,
    label: "Clients adhérents",
    usualSense: "Débit à la facture",
  },
  {
    account: SAGE_ACCOUNTS.cotisation,
    label: "Cotisations",
    usualSense: "Crédit à la facture",
  },
  {
    account: SAGE_ACCOUNTS.donation,
    label: "Dons",
    usualSense: "Crédit à la facture",
  },
  {
    account: SAGE_ACCOUNTS.ffttPayable,
    label: "FFTT — licences à reverser",
    usualSense: "Crédit à la facture",
  },
  {
    account: SAGE_ACCOUNTS.aidPassSport,
    label: "Pass Sport à recevoir",
    usualSense: "Débit à la pièce AID",
  },
  {
    account: SAGE_ACCOUNTS.aidPassPlus,
    label: "Pass Plus à recevoir",
    usualSense: "Débit à la pièce AID",
  },
  {
    account: SAGE_ACCOUNTS.aidLabaz,
    label: "Labaz à recevoir",
    usualSense: "Débit à la pièce AID",
  },
  {
    account: SAGE_ACCOUNTS.aidMunicipale,
    label: "Aide municipale à recevoir",
    usualSense: "Débit à la pièce AID",
  },
  {
    account: SAGE_ACCOUNTS.aidOther,
    label: "Autres aides à recevoir",
    usualSense: "Type d'aide inconnu",
  },
  {
    account: SAGE_ACCOUNTS.stripeClearing,
    label: "Stripe à rapprocher",
    usualSense: "Débit à l'encaissement CB",
  },
  {
    account: SAGE_ACCOUNTS.sumupClearing,
    label: "SumUp à rapprocher",
    usualSense: "Débit à l'encaissement TPE SumUp",
  },
  {
    account: SAGE_ACCOUNTS.bankTransfer,
    label: "Banque — virements",
    usualSense: "Débit à l'encaissement virement",
  },
  {
    account: SAGE_ACCOUNTS.chequesToDeposit,
    label: "Chèques à encaisser",
    usualSense: "Débit à la réception du chèque",
  },
  {
    account: SAGE_ACCOUNTS.holidayVouchers,
    label: "Chèques vacances à l'encaissement",
    usualSense: "Débit à la réception",
  },
  {
    account: SAGE_ACCOUNTS.otherSettlement,
    label: "Attente — autres règlements",
    usualSense: "Moyen « autre » non classé",
  },
  {
    account: SAGE_ACCOUNTS.cash,
    label: "Caisse",
    usualSense: "Débit des espèces",
  },
];
