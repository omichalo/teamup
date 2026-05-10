"use client";

import { DiscordResendDialog } from "@/components/compositions/dialogs/DiscordResendDialog";

export interface ConfirmResendDialogState {
  open: boolean;
  teamId: string | null;
  matchInfo: string | null;
  channelId?: string;
}

interface CompositionsResendDialogProps {
  state: ConfirmResendDialogState;
  teams: Array<{ id: string; name?: string }>;
  selectedJournee: number | null;
  selectedPhase: string | null;
  onCancel: () => void;
  onConfirmSend: (
    teamId: string,
    matchInfo: string,
    journee: number,
    phase: string,
    channelId: string | undefined
  ) => void;
}

export function CompositionsResendDialog({
  state,
  teams,
  selectedJournee,
  selectedPhase,
  onCancel,
  onConfirmSend,
}: CompositionsResendDialogProps) {
  const teamName = state.teamId
    ? teams.find((team) => team.id === state.teamId)?.name ?? null
    : null;

  return (
    <DiscordResendDialog
      open={state.open}
      matchInfo={state.matchInfo}
      teamName={teamName}
      onCancel={onCancel}
      onConfirm={() => {
        if (!state.teamId || !state.matchInfo || !selectedJournee || !selectedPhase) {
          return;
        }
        onConfirmSend(
          state.teamId,
          state.matchInfo,
          selectedJournee,
          selectedPhase,
          state.channelId
        );
      }}
    />
  );
}
