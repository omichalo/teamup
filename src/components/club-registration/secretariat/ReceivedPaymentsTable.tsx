"use client";

import {
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import type { ReceivedPayment } from "@/lib/club-registration/payment/types";
import {
  isReceivedPaymentReversible,
  isReceivedPaymentReversed,
} from "@/lib/club-registration/payment/payment-mutations";
import { formatCentsAsEuros } from "@/lib/pricing";

type Props = {
  receivedPayments: ReceivedPayment[];
  onReverse?: (payment: ReceivedPayment) => void;
};

export function ReceivedPaymentsTable({ receivedPayments, onReverse }: Props) {
  if (receivedPayments.length === 0) {
    return null;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Date</TableCell>
          <TableCell>Libellé</TableCell>
          <TableCell>N° / réf.</TableCell>
          <TableCell align="right">Montant</TableCell>
          <TableCell>Statut</TableCell>
          {onReverse ? <TableCell align="right">Actions</TableCell> : null}
        </TableRow>
      </TableHead>
      <TableBody>
        {receivedPayments.map((line) => {
          const reversed = isReceivedPaymentReversed(line);
          const reversible = isReceivedPaymentReversible(line);
          return (
            <TableRow
              key={line.id}
              {...(reversed
                ? { sx: { opacity: 0.65, textDecoration: "line-through" } }
                : {})}
            >
              <TableCell>
                {new Date(line.receivedAt).toLocaleDateString("fr-FR")}
              </TableCell>
              <TableCell>{line.label}</TableCell>
              <TableCell>{line.reference?.trim() || "—"}</TableCell>
              <TableCell align="right">
                {formatCentsAsEuros(line.amountCents)}
              </TableCell>
              <TableCell>
                {reversed ? (
                  <Tooltip title={line.reversalReason ?? "Encaissement annulé"}>
                    <Chip size="small" label="Annulé" color="default" />
                  </Tooltip>
                ) : line.recordedBy === "stripe" ? (
                  <Chip size="small" label="Stripe" color="info" variant="outlined" />
                ) : (
                  <Chip size="small" label="Actif" color="success" variant="outlined" />
                )}
              </TableCell>
              {onReverse ? (
                <TableCell align="right">
                  {reversible ? (
                    <Button size="small" color="error" onClick={() => onReverse(line)}>
                      Annuler
                    </Button>
                  ) : null}
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
