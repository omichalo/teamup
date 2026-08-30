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
import { PageHeader } from "@/components/ui";
import { TabPanel } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { isAttendanceCancellationManager } from "@/lib/attendance/access";
import { todayYmdInParis } from "@/lib/attendance/calendar";
import {
  attendancePickerHref,
  readAttendanceDateParam,
} from "@/lib/attendance/urls";
import { formatMinutesAsLabel } from "@/lib/club-registration-config/slot-schedule";
import type { AttendanceMemberSearchHit, AttendanceRosterPerson } from "@/lib/attendance/types";
import { resolveRole } from "@/lib/auth/roles";
import { useAttendanceSession } from "./useAttendanceSession";
import { AttendanceRoster } from "./AttendanceRoster";
import { AttendanceSearchDialog } from "./AttendanceSearchDialog";
import { AttendanceGuestDialog } from "./AttendanceGuestDialog";
import { AttendanceStatsPanel } from "./AttendanceStatsPanel";
import { AttendanceSessionDock, AttendanceSessionDockSpacer } from "./AttendanceSessionDock";
import { AttendanceCancellationConfirmDialog } from "./AttendanceCancellationConfirmDialog";

export function AttendanceSessionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const date = readAttendanceDateParam(searchParams.get("date"), todayYmdInParis());
  const slotId = searchParams.get("slot")?.trim() || null;
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);

  const { session, loading, error, busyKey, reload, togglePresent } = useAttendanceSession(
    date,
    slotId
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

  async function handleWalkIn(member: AttendanceMemberSearchHit, addSlot: boolean) {
    if (!slotId || cancelled) return;
    setActionError(null);
    try {
      const markRes = await fetch("/api/club/attendance/marks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          slotId,
          kind: "walkin",
          registrationId: member.registrationId,
        }),
      });
      const markJson = await readJsonResponse<{ error?: string }>(markRes);
      if (!markRes.ok) {
        throw new Error(markJson.error ?? "Impossible de pointer");
      }
      if (addSlot) {
        const slotRes = await fetch("/api/club/attendance/add-slot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            slotId,
            registrationId: member.registrationId,
          }),
        });
        const slotJson = await readJsonResponse<{ error?: string }>(slotRes);
        if (!slotRes.ok) {
          throw new Error(slotJson.error ?? "Impossible d'ajouter le créneau");
        }
      }
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de pointer";
      setActionError(message);
      throw err;
    }
  }

  async function handleGuest(payload: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  }) {
    if (!slotId || cancelled) return;
    setActionError(null);
    try {
      const res = await fetch("/api/club/attendance/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slotId, ...payload }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(json.error ?? "Impossible d'enregistrer l'essai");
      }
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'enregistrer l'essai";
      setActionError(message);
      throw err;
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
    });
  }

  if (!slotId) {
    return null;
  }

  const slotTitle = session
    ? `${formatMinutesAsLabel(session.slot.startMinutes)} – ${formatMinutesAsLabel(session.slot.endMinutes)}`
    : "Séance";
  const slotSubtitle = session
    ? `${session.slot.siteLabel} · ${session.slot.label}`
    : "Chargement du créneau…";

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
            emptyLabel="Tout le monde est pointé, ou aucun inscrit."
          />
          <AttendanceRoster
            title="Présents inscrits"
            people={present}
            filter={filter}
            busyKey={busyKey}
            disabled={cancelled}
            onToggle={onToggle}
            emptyLabel="Personne n'est encore pointé."
          />
          <AttendanceRoster
            title="Hors créneau / essais"
            people={session?.extras ?? []}
            filter=""
            busyKey={busyKey}
            disabled={cancelled}
            onToggle={onToggle}
            emptyLabel="Aucun visiteur pour cette séance."
          />
          {!cancelled ? <AttendanceSessionDockSpacer /> : null}
        </Stack>
      </TabPanel>
      <TabPanel value={tab} index={1} baseId="attendance">
        <Stack spacing={2}>
          <Button
            variant="outlined"
            href={`/api/club/attendance/export?date=${encodeURIComponent(date)}&slotId=${encodeURIComponent(slotId)}`}
            sx={{ alignSelf: "flex-start", minHeight: 48 }}
          >
            Exporter CSV
          </Button>
          <AttendanceStatsPanel date={date} slotId={slotId} />
        </Stack>
      </TabPanel>
      {tab === 0 && !cancelled ? (
        <AttendanceSessionDock
          onSearch={() => setSearchOpen(true)}
          onGuest={() => setGuestOpen(true)}
        />
      ) : null}
      <AttendanceSearchDialog
        open={searchOpen}
        slotId={slotId}
        onClose={() => setSearchOpen(false)}
        onPick={handleWalkIn}
      />
      <AttendanceGuestDialog
        open={guestOpen}
        onClose={() => setGuestOpen(false)}
        onSubmit={handleGuest}
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
