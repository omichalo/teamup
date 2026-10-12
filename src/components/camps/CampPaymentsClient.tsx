"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CampRegistration } from "@/lib/camps/types";
import {
  CAMP_PAYMENT_METHOD_IDS,
  CAMP_PAYMENT_METHOD_LABELS,
  type CampPaymentMethodId,
} from "@/lib/camps/constants";

export function CampPaymentsClient() {
  const [registrations, setRegistrations] = useState<CampRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [methods, setMethods] = useState<Record<string, CampPaymentMethodId>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/camps/registrations?scope=payments", {
        credentials: "include",
      });
      const json = (await res.json()) as {
        registrations?: CampRegistration[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Chargement impossible");
      setRegistrations(json.registrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function recordPayment(reg: CampRegistration) {
    const due =
      reg.pricingQuote.totalCents -
      reg.payment.receivedPayments.reduce((s, p) => s + p.amountCents, 0);
    if (due <= 0) return;
    setBusyId(reg.id);
    setError(null);
    try {
      const method = methods[reg.id] ?? reg.payment.chosenMethod ?? "cheque";
      const res = await fetch(`/api/club/camps/registrations/${reg.id}/payments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, amountCents: due }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Encaissement impossible");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: 2, py: 3 }}>
      <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 1 }}>
        Paiements stages
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Suivi des encaissements et attribution des pièces STG-FAC / STG-REC.
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {registrations.map((reg) => {
            const paid = reg.payment.receivedPayments.reduce(
              (s, p) => s + p.amountCents,
              0
            );
            const due = Math.max(0, reg.pricingQuote.totalCents - paid);
            return (
              <Box
                key={reg.id}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography fontWeight={700}>
                      {reg.lastName.toUpperCase()} {reg.firstName} ·{" "}
                      {reg.formulaLabel || reg.formulaId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dû {(reg.pricingQuote.totalCents / 100).toFixed(2)} € ·
                      Encaissé {(paid / 100).toFixed(2)} € · Reste{" "}
                      {(due / 100).toFixed(2)} €
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      FAC {reg.payment.invoiceNumber ?? "—"} ·{" "}
                      {reg.payment.receivedPayments
                        .map((p) => p.documentNumber)
                        .filter(Boolean)
                        .join(", ") || "pas de REC"}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={reg.status} />
                    {due > 0 ? (
                      <>
                        <TextField
                          select
                          size="small"
                          label="Mode"
                          value={
                            methods[reg.id] ??
                            reg.payment.chosenMethod ??
                            "cheque"
                          }
                          onChange={(e) =>
                            setMethods((prev) => ({
                              ...prev,
                              [reg.id]: e.target.value as CampPaymentMethodId,
                            }))
                          }
                          sx={{ minWidth: 140 }}
                        >
                          {CAMP_PAYMENT_METHOD_IDS.map((m) => (
                            <MenuItem key={m} value={m}>
                              {CAMP_PAYMENT_METHOD_LABELS[m]}
                            </MenuItem>
                          ))}
                        </TextField>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={busyId === reg.id}
                          onClick={() => void recordPayment(reg)}
                        >
                          Encaisser le reste
                        </Button>
                      </>
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
