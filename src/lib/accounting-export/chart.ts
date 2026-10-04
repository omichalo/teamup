/**
 * Plan de comptes et journaux proposés pour l'import Sage.
 * Les numéros sont à confirmer sur le plan ouvert dans le dossier du club.
 */

export const SAGE_LABEL_MAX = 69;
export const SAGE_PIECE_MAX = 17;

export const SAGE_JOURNALS = {
  sales: "VE",
  bank: "BQ",
  cash: "CA",
  general: "OD",
} as const;

export const SAGE_ACCOUNTS = {
  client: "411000",
  cotisation: "756000",
  donation: "754000",
  ffttPayable: "467100",
  stripeClearing: "511200",
  sumupClearing: "511210",
  bankTransfer: "512000",
  chequesToDeposit: "511300",
  holidayVouchers: "511400",
  otherSettlement: "511900",
  cash: "531000",
  aidPassSport: "467200",
  aidPassPlus: "467210",
  aidLabaz: "467220",
  aidMunicipale: "467230",
  aidOther: "467290",
} as const;

export type SageAccount = (typeof SAGE_ACCOUNTS)[keyof typeof SAGE_ACCOUNTS];

const AID_ACCOUNT_BY_TYPE: Record<string, SageAccount> = {
  pass_sport: SAGE_ACCOUNTS.aidPassSport,
  pass_plus: SAGE_ACCOUNTS.aidPassPlus,
  labaz: SAGE_ACCOUNTS.aidLabaz,
  aide_municipale: SAGE_ACCOUNTS.aidMunicipale,
};

export function aidAccountForType(aidType: string): {
  account: SageAccount;
  known: boolean;
} {
  const account = AID_ACCOUNT_BY_TYPE[aidType];
  if (account) {
    return { account, known: true };
  }
  return { account: SAGE_ACCOUNTS.aidOther, known: false };
}

export function treasuryForReceivedMethod(method: string): {
  journal: string;
  account: SageAccount;
  known: boolean;
  nature: string;
} {
  switch (method) {
    case "card":
      return {
        journal: SAGE_JOURNALS.bank,
        account: SAGE_ACCOUNTS.stripeClearing,
        known: true,
        nature: "Encaissement CB Stripe",
      };
    case "sumup":
      return {
        journal: SAGE_JOURNALS.bank,
        account: SAGE_ACCOUNTS.sumupClearing,
        known: true,
        nature: "Encaissement SumUp",
      };
    case "transfer":
      return {
        journal: SAGE_JOURNALS.bank,
        account: SAGE_ACCOUNTS.bankTransfer,
        known: true,
        nature: "Encaissement virement",
      };
    case "cheque":
      return {
        journal: SAGE_JOURNALS.bank,
        account: SAGE_ACCOUNTS.chequesToDeposit,
        known: true,
        nature: "Encaissement chèque",
      };
    case "holiday_vouchers":
      return {
        journal: SAGE_JOURNALS.bank,
        account: SAGE_ACCOUNTS.holidayVouchers,
        known: true,
        nature: "Encaissement chèques vacances",
      };
    case "cash":
      return {
        journal: SAGE_JOURNALS.cash,
        account: SAGE_ACCOUNTS.cash,
        known: true,
        nature: "Encaissement espèces",
      };
    default:
      return {
        journal: SAGE_JOURNALS.bank,
        account: SAGE_ACCOUNTS.otherSettlement,
        known: false,
        nature: "Encaissement autre",
      };
  }
}

/**
 * Classifie un encaissement legacy `other` d'après son libellé / note.
 * Retourne null si aucune heuristique ne s'applique.
 */
export function classifyOtherReceivedMethod(params: {
  label?: string | null | undefined;
  note?: string | null | undefined;
}): "sumup" | "transfer" | "non_settlement" | null {
  const text = `${params.label ?? ""} ${params.note ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!text.trim()) {
    return null;
  }
  // SumUp / virement d'abord : une note « trop perçu » ne doit pas masquer un TPE réel.
  if (text.includes("sum up") || text.includes("sumup") || text.includes("tpe")) {
    return "sumup";
  }
  if (text.includes("virement") || /\bvir\b/.test(text)) {
    return "transfer";
  }
  if (
    text.includes("remise") ||
    text.includes("trop percu") ||
    text.includes("trop-percu") ||
    text.includes("reduction")
  ) {
    return "non_settlement";
  }
  return null;
}
