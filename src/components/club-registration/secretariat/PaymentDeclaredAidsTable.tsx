"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  isCollectableAid,
  markAidReceived,
  markAidUnreceived,
} from "@/lib/club-registration/payment/aid-receipt";
import type { PaymentAid } from "@/lib/club-registration/payment/types";
import { formatCentsAsEuros } from "@/lib/pricing";
import { SecretariatAidReceiptCheckbox } from "./SecretariatAidReceiptCheckbox";

type Props = {
  registrationId: string;
  aids: PaymentAid[];
  onAidsChange: (aids: PaymentAid[]) => void;
};

type AidReceiptFeedback = {
  severity: "success" | "error";
  message: string;
};

async function patchPaymentAids(registrationId: string, paymentAids: PaymentAid[]) {
  const res = await fetch(
    `/api/club/registration?id=${encodeURIComponent(registrationId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentAids: paymentAids.map((aid) => ({
          type: aid.type,
          label: aid.label,
          amountCents: aid.amountCents,
          ...(aid.reference ? { reference: aid.reference } : {}),
          ...(aid.note ? { note: aid.note } : {}),
          ...(aid.received === true ? { received: true } : { received: false }),
        })),
      }),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json.error || "Impossible de mettre à jour la réception de l'aide.");
  }
}

function nextAidsAfterReceiptToggle(
  aids: PaymentAid[],
  aid: PaymentAid,
  received: boolean
): PaymentAid[] {
  return aids.map((item) => {
    if (item.type !== aid.type) return item;
    return received
      ? markAidReceived(item, { uid: "pending", at: new Date().toISOString() })
      : markAidUnreceived(item);
  });
}

export function PaymentDeclaredAidsTable({ registrationId, aids, onAidsChange }: Props) {
  const requestIdRef = useRef(0);
  const aidsRef = useRef(aids);
  aidsRef.current = aids;
  const [feedback, setFeedback] = useState<AidReceiptFeedback | null>(null);

  const toggleReceived = async (aid: PaymentAid, received: boolean) => {
    const previousAids = aidsRef.current;
    const nextAids = nextAidsAfterReceiptToggle(previousAids, aid, received);
    const requestId = ++requestIdRef.current;
    aidsRef.current = nextAids;
    onAidsChange(nextAids);
    try {
      await patchPaymentAids(registrationId, nextAids);
      if (requestId !== requestIdRef.current) return;
      setFeedback({
        severity: "success",
        message: received
          ? `${aid.label} : réception enregistrée.`
          : `${aid.label} : réception annulée.`,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      aidsRef.current = previousAids;
      onAidsChange(previousAids);
      setFeedback({
        severity: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour la réception de l'aide.",
      });
    }
  };

  return (
    <>
      <Typography variant="subtitle2" fontWeight={600}>
        Aides déclarées
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Cochez « Aide reçue » ici : la case se met à jour tout de suite, sans recharger
        le dossier. Un message confirme l&apos;enregistrement.
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Aide</TableCell>
            <TableCell align="right">Montant</TableCell>
            <TableCell>Référence / note</TableCell>
            <TableCell>Réception</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {aids.map((aid) => (
            <TableRow key={aid.type}>
              <TableCell>{aid.label}</TableCell>
              <TableCell align="right">{formatCentsAsEuros(aid.amountCents)}</TableCell>
              <TableCell>{[aid.reference, aid.note].filter(Boolean).join(" — ") || "—"}</TableCell>
              <TableCell>
                {isCollectableAid(aid) ? (
                  <SecretariatAidReceiptCheckbox
                    checked={aid.received === true}
                    onChange={(nextReceived) => void toggleReceived(aid, nextReceived)}
                  />
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {feedback ? (
        <Snackbar
          open
          autoHideDuration={feedback.severity === "success" ? 4000 : 8000}
          onClose={() => setFeedback(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity={feedback.severity}
            variant="filled"
            onClose={() => setFeedback(null)}
          >
            {feedback.message}
          </Alert>
        </Snackbar>
      ) : null}
    </>
  );
}
