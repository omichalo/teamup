"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Container,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { PageHeader, TabPanel } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { isAttendanceCancellationManager } from "@/lib/attendance/access";
import { isoWeekStartYmd, todayYmdInParis } from "@/lib/attendance/calendar";
import {
  attendancePickerHref,
  readAttendanceDateParam,
} from "@/lib/attendance/urls";
import { formatMinutesAsLabel } from "@/lib/club-registration-config/slot-schedule";
import type { AttendanceRosterPerson } from "@/lib/attendance/types";
import { resolveRole } from "@/lib/auth/roles";
import { useAttendanceSession } from "./useAttendanceSession";
import { AttendanceRoster } from "./AttendanceRoster";
import { AttendanceCampSessionExtras } from "./AttendanceCampSessionExtras";
import { AttendanceTrainingSessionExtras } from "./AttendanceTrainingSessionExtras";
import { AttendanceSessionStatsTab } from "./AttendanceSessionStatsTab";
import { AttendanceCancellationConfirmDialog } from "./AttendanceCancellationConfirmDialog";
import { AttendanceRemoveFromSlotDialog } from "./AttendanceRemoveFromSlotDialog";
import { AttendanceSessionCoachMessage } from "./AttendanceSessionCoachMessage";

function setErrorMessage(
  setter: (value: string | null) => void,
  message: string
) {
  setter(message.length > 0 ? message : null);
}

export function AttendanceSessionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const date = readAttendanceDateParam(searchParams.get("date"), todayYmdInParis());
  const slotId = searchParams.get("slot")?.trim() || null;
  const isCampSession = searchParams.get("source")?.trim() === "camp";
  const source = isCampSession ? ("camp" as const) : ("training" as const);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AttendanceRosterPerson | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const { session, loading, error, busyKey, reload, togglePresent } = useAttendanceSession(
    date,
    slotId,
    source
  );

  const canManage = isAttendanceCancellationManager(resolveRole(user?.role));

  useEffect(() => {
    if (!slotId) {
      router.replace(attendancePickerHref(date));
    }
  }, [date, router, slotId]);

  const waiting = session?.roster.filter((person) => !person.present) ?? [];
  const present = session?.roster.filter((person) => person.present) ?? [];
  const counts = session?.counts;
  const cancelled = session?.cancelled === true;

  async function confirmRemoveFromSlot() {
    if (!slotId || !removeTarget?.registrationId || cancelled) return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      const res = await fetch("/api/club/attendance/remove-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          slotId,
          registrationId: removeTarget.registrationId,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(json.error ?? "Impossible de retirer du créneau");
      }
      setRemoveTarget(null);
      await reload();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setRemoveBusy(false);
    }
  }

  async function confirmRestore() {
    if (!slotId) return;
    setRestoreBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/club/attendance/cancellations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slotId }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(json.error ?? "Impossible de restaurer");
      }
      setRestoreOpen(false);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setRestoreBusy(false);
    }
  }

  function onToggle(person: AttendanceRosterPerson) {
    if (cancelled) return;
    void togglePresent({
      personKey: person.personKey,
      kind: person.kind,
      present: person.present,
      ...(person.registrationId ? { registrationId: person.registrationId } : {}),
      ...(person.leadId ? { leadId: person.leadId } : {}),
      ...(person.markId ? { markId: person.markId } : {}),
      ...(person.externalId ? { externalId: person.externalId } : {}),
    });
  }

  if (!slotId) return null;

  const slotTitle = session
    ? `${formatMinutesAsLabel(session.slot.startMinutes)} – ${formatMinutesAsLabel(session.slot.endMinutes)}`
    : "Séance";
  const slotSubtitle = session
    ? `${session.slot.siteLabel} · ${session.slot.label}`
    : "Chargement du créneau…";
  const removeFromSlot =
    cancelled || isCampSession
      ? undefined
      : (person: AttendanceRosterPerson) => {
          setRemoveError(null);
          setRemoveTarget(person);
        };

  return (
    <Container maxWidth="md" sx={{ pt: { xs: 2, md: 3 }, pb: 2 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => router.push(attendancePickerHref(date))}
        sx={{ mb: 1, minHeight: 44 }}
      >
        Changer de créneau
      </Button>
      <PageHeader
        eyebrow={date}
        title={slotTitle}
        subtitle={slotSubtitle}
        marginBottom={2}
        actions={
          counts ? (
            <Typography variant="body2" color="text.secondary">
              {counts.presentEnrolled}/{counts.enrolled} inscrits
              {isCampSession
                ? ` · ${counts.walkin} hors inscr. · ${counts.external ?? 0} ext.`
                : null}
            </Typography>
          ) : undefined
        }
      />
      <Tabs
        value={tab}
        onChange={(_event, value: number) => setTab(value)}
        aria-label="Vues de la séance"
        sx={{ mb: 2 }}
      >
        <Tab id="attendance-tab-0" aria-controls="attendance-tabpanel-0" label="Pointage" />
        <Tab id="attendance-tab-1" aria-controls="attendance-tabpanel-1" label="Taux" />
      </Tabs>
      {cancelled ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            canManage ? (
              <Button color="inherit" size="small" onClick={() => setRestoreOpen(true)}>
                Restaurer
              </Button>
            ) : undefined
          }
        >
          Séance annulée — le pointage est désactivé. Les présences déjà
          enregistrées sont conservées.
        </Alert>
      ) : null}
      {session ? (
        <AttendanceSessionCoachMessage
          date={date}
          slotId={slotId}
          coachMessage={session.coachMessage}
          canManage={canManage}
          weekLabel={isoWeekStartYmd(date)}
          onChanged={reload}
        />
      ) : null}

      {actionError || error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError ?? error}
        </Alert>
      ) : null}
      <TabPanel value={tab} index={0} baseId="attendance">
        <Stack spacing={3}>
          {loading && !session ? (
            <Alert severity="info">Chargement de la liste…</Alert>
          ) : null}
          <AttendanceRoster
            title="À pointer"
            people={waiting}
            filter={filter}
            onFilterChange={setFilter}
            busyKey={busyKey}
            disabled={cancelled}
            onToggle={onToggle}
            onRemoveFromSlot={removeFromSlot}
            emptyLabel="Tout le monde est pointé, ou aucun inscrit."
          />
          <AttendanceRoster
            title="Présents inscrits"
            people={present}
            filter={filter}
            busyKey={busyKey}
            disabled={cancelled}
            onToggle={onToggle}
            onRemoveFromSlot={removeFromSlot}
            emptyLabel="Personne n'est encore pointé."
          />
          <AttendanceRoster
            title={
              isCampSession
                ? "Hors inscription / extérieurs"
                : "Hors créneau / essais"
            }
            people={session?.extras ?? []}
            filter=""
            busyKey={busyKey}
            disabled={cancelled}
            onToggle={onToggle}
            emptyLabel={
              isCampSession
                ? "Aucun adhérent hors inscription ni extérieur."
                : "Aucun visiteur pour cette séance."
            }
          />
        </Stack>
      </TabPanel>
      <TabPanel value={tab} index={1} baseId="attendance">
        <AttendanceSessionStatsTab
          date={date}
          slotId={slotId}
          isCampSession={isCampSession}
        />
      </TabPanel>
      {tab === 0 && isCampSession ? (
        <AttendanceCampSessionExtras
          date={date}
          slotId={slotId}
          cancelled={cancelled}
          onReload={reload}
          onError={(message) => setErrorMessage(setActionError, message)}
        />
      ) : null}
      {tab === 0 && !isCampSession ? (
        <AttendanceTrainingSessionExtras
          date={date}
          slotId={slotId}
          cancelled={cancelled}
          onReload={reload}
          onError={(message) => setErrorMessage(setActionError, message)}
        />
      ) : null}
      <AttendanceRemoveFromSlotDialog
        open={Boolean(removeTarget)}
        playerName={removeTarget?.displayName ?? ""}
        slotLabel={session?.slot.label}
        busy={removeBusy}
        error={removeError}
        onCancel={() => {
          if (!removeBusy) setRemoveTarget(null);
        }}
        onConfirm={() => void confirmRemoveFromSlot()}
      />
      <AttendanceCancellationConfirmDialog
        open={restoreOpen}
        mode="restore"
        scope="slot"
        dateLabel={date}
        slotLabel={session?.slot.label}
        count={1}
        busy={restoreBusy}
        error={actionError}
        onCancel={() => {
          if (!restoreBusy) setRestoreOpen(false);
        }}
        onConfirm={() => void confirmRestore()}
      />
    </Container>
  );
}
