"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Container, Stack, TextField, Typography } from "@mui/material";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { isAttendanceCancellationManager } from "@/lib/attendance/access";
import { todayYmdInParis } from "@/lib/attendance/calendar";
import { attendanceSessionHref, readAttendanceDateParam } from "@/lib/attendance/urls";
import type { AttendanceSlotOption } from "@/lib/attendance/types";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { resolveRole } from "@/lib/auth/roles";
import { useAttendanceSlots } from "./useAttendanceSlots";
import { AttendanceSlotPicker } from "./AttendanceSlotPicker";
import { AttendanceCancellationToolbar } from "./AttendanceCancellationToolbar";
import {
  AttendanceCancellationConfirmDialog,
  type AttendanceCancellationDialogMode,
  type AttendanceCancellationDialogScope,
} from "./AttendanceCancellationConfirmDialog";

function formatDayLabel(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatShortDay(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

type PendingAction = {
  mode: AttendanceCancellationDialogMode;
  scope: AttendanceCancellationDialogScope;
  slot?: AttendanceSlotOption;
  count: number;
};

export function AttendanceSlotSelectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const date = readAttendanceDateParam(searchParams.get("date"), todayYmdInParis());
  const { slots, week, loading, error, reload } = useAttendanceSlots(date);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = isAttendanceCancellationManager(resolveRole(user?.role));

  useEffect(() => {
    if (!searchParams.get("date")) {
      router.replace(`/club/presences?date=${encodeURIComponent(date)}`);
    }
  }, [date, router, searchParams]);

  const dayActiveCount = useMemo(
    () => slots.filter((slot) => !slot.cancelled).length,
    [slots]
  );
  const dayCancelledCount = useMemo(
    () => slots.filter((slot) => slot.cancelled).length,
    [slots]
  );

  const dateLabel = formatDayLabel(date);
  const weekLabel =
    week != null
      ? `${formatShortDay(week.weekStart)} → ${formatShortDay(week.weekEnd)}`
      : dateLabel;

  async function runMutation(body: Record<string, unknown>, mode: AttendanceCancellationDialogMode) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/club/attendance/cancellations", {
        method: mode === "cancel" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(json.error ?? "Action impossible");
      }
      setPending(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function confirmPending() {
    if (!pending) return;
    if (pending.scope === "slot" && pending.slot) {
      void runMutation({ date, slotId: pending.slot.slotId }, pending.mode);
      return;
    }
    void runMutation({ date, scope: pending.scope }, pending.mode);
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 3 } }}>
      <PageHeader
        eyebrow="Présences"
        title="Choisir un créneau"
        subtitle="Sélectionnez la séance à pointer. Le créneau le plus proche de l’heure actuelle est mis en avant."
        marginBottom={3}
      />
      <Stack spacing={3}>
        <TextField
          label="Jour"
          type="date"
          value={date}
          onChange={(e) => {
            const next = e.target.value;
            router.replace(`/club/presences?date=${encodeURIComponent(next)}`);
          }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 280 }}
        />
        {canManage ? (
          <AttendanceCancellationToolbar
            week={week}
            dayActiveCount={dayActiveCount}
            dayCancelledCount={dayCancelledCount}
            weekLabel={weekLabel}
            disabled={loading || busy}
            onCancelDay={() =>
              setPending({ mode: "cancel", scope: "day", count: dayActiveCount })
            }
            onCancelWeek={() =>
              setPending({
                mode: "cancel",
                scope: "week",
                count: week?.weekActiveCount ?? 0,
              })
            }
            onRestoreDay={() =>
              setPending({ mode: "restore", scope: "day", count: dayCancelledCount })
            }
            onRestoreWeek={() =>
              setPending({
                mode: "restore",
                scope: "week",
                count: week?.weekCancelledCount ?? 0,
              })
            }
          />
        ) : null}
        {actionError ? <Alert severity="error">{actionError}</Alert> : null}
        <Typography variant="subtitle2" color="text.secondary">
          Créneaux du jour
        </Typography>
        <AttendanceSlotPicker
          slots={slots}
          loading={loading}
          error={error}
          selectedSlotId={null}
          canManageCancellations={canManage}
          onSelect={(slotId) => router.push(attendanceSessionHref(date, slotId))}
          onCancelSlot={(slot) =>
            setPending({ mode: "cancel", scope: "slot", slot, count: 1 })
          }
          onRestoreSlot={(slot) =>
            setPending({ mode: "restore", scope: "slot", slot, count: 1 })
          }
        />
      </Stack>
      <AttendanceCancellationConfirmDialog
        open={pending !== null}
        mode={pending?.mode ?? "cancel"}
        scope={pending?.scope ?? "slot"}
        dateLabel={dateLabel}
        weekLabel={weekLabel}
        slotLabel={pending?.slot?.label}
        count={pending?.count ?? 0}
        busy={busy}
        error={actionError}
        onCancel={() => {
          if (!busy) {
            setPending(null);
            setActionError(null);
          }
        }}
        onConfirm={confirmPending}
      />
    </Container>
  );
}
