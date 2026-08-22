"use client";

import { useState } from "react";
import { Button } from "@mui/material";
import { SlotEnrollmentsConfirmDialog } from "@/components/club-registration-config/SlotEnrollmentsConfirmDialog";

type Props = {
  closed: boolean;
  busy: boolean;
  slotLabel?: string | undefined;
  onToggle: () => void | Promise<void>;
};

export function SlotEnrollmentsToggle({ closed, busy, slotLabel, onToggle }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [intentClosing, setIntentClosing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = busy || pending;
  const label = closed ? "Réouvrir les adhésions" : "Fermer les adhésions";

  return (
    <>
      <Button
        variant={closed ? "contained" : "outlined"}
        color={closed ? "warning" : "primary"}
        size="small"
        disabled={submitting}
        onClick={(event) => {
          event.stopPropagation();
          setIntentClosing(!closed);
          setError(null);
          setConfirmOpen(true);
        }}
        aria-label={label}
      >
        {label}
      </Button>
      <SlotEnrollmentsConfirmDialog
        open={confirmOpen}
        closing={intentClosing}
        busy={submitting}
        error={error}
        slotLabel={slotLabel}
        onCancel={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (submitting) return;
          void (async () => {
            setPending(true);
            setError(null);
            try {
              await onToggle();
              setConfirmOpen(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Impossible de mettre à jour les adhésions");
            } finally {
              setPending(false);
            }
          })();
        }}
      />
    </>
  );
}
