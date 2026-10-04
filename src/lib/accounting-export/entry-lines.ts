import { SAGE_ACCOUNTS } from "./chart";
import { sageEntryLabel } from "./format-sage";
import type { SageEntryLine, SagePartyContext, SignedAccountSplit } from "./types";

export function entryLine(
  params: {
    context: SagePartyContext;
    journal: string;
    date: string;
    piece: string;
    teamupDocumentNumber: string;
  },
  movement: {
    account: string;
    auxiliary: string;
    label: string;
    debitCents: number;
    creditCents: number;
  }
): SageEntryLine {
  const [day, month, year] = params.date.split("/");
  return {
    journal: params.journal,
    date: params.date,
    sortDate: `${year ?? ""}${month ?? ""}${day ?? ""}`,
    piece: params.piece,
    account: movement.account,
    auxiliary: movement.auxiliary,
    label: movement.label,
    debitCents: movement.debitCents,
    creditCents: movement.creditCents,
    teamupDocumentNumber: params.teamupDocumentNumber,
    registrationId: params.context.registrationId,
    adherentName: params.context.adherentName,
    seasonLabel: params.context.seasonLabel,
  };
}

export function settlementLines(params: {
  context: SagePartyContext;
  journal: string;
  date: string;
  piece: string;
  teamupDocumentNumber: string;
  auxiliary: string;
  treasuryAccount: string;
  amountCents: number;
  clientNature: string;
  treasuryNature: string;
  reverse: boolean;
}): SageEntryLine[] {
  const clientDebit = params.reverse ? params.amountCents : 0;
  const clientCredit = params.reverse ? 0 : params.amountCents;
  const treasuryDebit = params.reverse ? 0 : params.amountCents;
  const treasuryCredit = params.reverse ? params.amountCents : 0;
  return [
    entryLine(params, {
      account: params.treasuryAccount,
      auxiliary: "",
      label: sageEntryLabel(
        params.context.adherentName,
        params.treasuryNature,
        params.context.seasonLabel
      ),
      debitCents: treasuryDebit,
      creditCents: treasuryCredit,
    }),
    entryLine(params, {
      account: SAGE_ACCOUNTS.client,
      auxiliary: params.auxiliary,
      label: sageEntryLabel(
        params.context.adherentName,
        params.clientNature,
        params.context.seasonLabel
      ),
      debitCents: clientDebit,
      creditCents: clientCredit,
    }),
  ];
}

export function movementsToLines(params: {
  context: SagePartyContext;
  journal: string;
  date: string;
  piece: string;
  teamupDocumentNumber: string;
  auxiliary: string;
  clientLabel: string;
  totalCents: number;
  splits: SignedAccountSplit[];
  splitNature: (account: string) => string;
}): SageEntryLine[] | null {
  const built: SageEntryLine[] = [];
  if (params.totalCents > 0) {
    built.push(
      entryLine(params, {
        account: SAGE_ACCOUNTS.client,
        auxiliary: params.auxiliary,
        label: params.clientLabel,
        debitCents: params.totalCents,
        creditCents: 0,
      })
    );
  } else if (params.totalCents < 0) {
    built.push(
      entryLine(params, {
        account: SAGE_ACCOUNTS.client,
        auxiliary: params.auxiliary,
        label: params.clientLabel,
        debitCents: 0,
        creditCents: -params.totalCents,
      })
    );
  }

  for (const split of params.splits) {
    if (split.signedCents === 0) {
      continue;
    }
    const debit = split.signedCents < 0;
    built.push(
      entryLine(params, {
        account: split.account,
        auxiliary: "",
        label: sageEntryLabel(
          params.context.adherentName,
          params.splitNature(split.account),
          params.context.seasonLabel
        ),
        debitCents: debit ? -split.signedCents : 0,
        creditCents: debit ? 0 : split.signedCents,
      })
    );
  }

  const debitCents = built.reduce((sum, line) => sum + line.debitCents, 0);
  const creditCents = built.reduce((sum, line) => sum + line.creditCents, 0);
  if (debitCents !== creditCents || debitCents === 0) {
    return null;
  }
  return built;
}
