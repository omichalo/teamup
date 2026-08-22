"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { PageHeader } from "@/components/ui";
import { readJsonResponse } from "@/lib/http/read-json-response";
import {
  defaultExpandedSiteIds,
  filterOccupancyGroups,
  patchOccupancyEnrollmentsClosed,
  type OccupancyStatusFilter,
} from "@/lib/club-slot-occupancy/filter-groups";
import type { SlotOccupancySummary } from "@/lib/club-slot-occupancy/types";
import { SlotOccupancyEnrolledDrawer } from "./SlotOccupancyEnrolledDrawer";
import { SlotOccupancyFilters } from "./SlotOccupancyFilters";
import { SlotOccupancySiteGroupCard } from "./SlotOccupancySiteGroupCard";
import { useSlotOccupancy } from "./useSlotOccupancy";

export function SlotOccupancyClient() {
  const { groups, setGroups, seasonLabel, canManageEnrollments, loading, error } =
    useSlotOccupancy();
  const [selected, setSelected] = useState<SlotOccupancySummary | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OccupancyStatusFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const didInitExpand = useRef(false);

  const visibleGroups = useMemo(
    () => filterOccupancyGroups(groups, { status, query }),
    [groups, status, query]
  );

  useEffect(() => {
    if (groups.length === 0 || didInitExpand.current) {
      return;
    }
    setExpandedIds(defaultExpandedSiteIds(groups));
    didInitExpand.current = true;
  }, [groups]);

  useEffect(() => {
    if (!didInitExpand.current) {
      return;
    }
    const filtering = status !== "all" || query.trim().length > 0;
    if (!filtering) {
      return;
    }
    setExpandedIds(new Set(visibleGroups.map((group) => group.siteId)));
  }, [status, query, visibleGroups]);

  const applyEnrollmentsClosed = useCallback((slotId: string, closed: boolean) => {
    setGroups((prev) => patchOccupancyEnrollmentsClosed(prev, slotId, closed));
    setSelected((prev) => (prev && prev.slotId === slotId ? { ...prev, enrollmentsClosed: closed } : prev));
  }, [setGroups]);

  const onToggleEnrollments = useCallback(
    async (slot: SlotOccupancySummary) => {
      const nextClosed = !slot.enrollmentsClosed;
      setBusySlotId(slot.slotId);
      try {
        const res = await fetch(
          `/api/club/slots/occupancy/${encodeURIComponent(slot.slotId)}/enrollments-closed`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ closed: nextClosed }),
          }
        );
        const json = await readJsonResponse<{ error?: string }>(res);
        if (!res.ok) {
          throw new Error(json.error ?? "Impossible de mettre à jour les adhésions");
        }
        applyEnrollmentsClosed(slot.slotId, nextClosed);
      } catch (err) {
        throw err instanceof Error ? err : new Error("Impossible de mettre à jour les adhésions");
      } finally {
        setBusySlotId(null);
      }
    },
    [applyEnrollmentsClosed]
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 3 } }}>
      <PageHeader
        eyebrow="Créneaux"
        title="Remplissage des créneaux"
        subtitle={
          seasonLabel
            ? `Effectifs ${seasonLabel} : taux de remplissage et liste des inscrits.`
            : "Taux de remplissage et liste des inscrits."
        }
        marginBottom={3}
      />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Stack spacing={2}>
          <SlotOccupancyFilters
            query={query}
            onQueryChange={setQuery}
            status={status}
            onStatusChange={setStatus}
          />
          {visibleGroups.length === 0 ? (
            <Typography color="text.secondary">Aucun créneau ne correspond aux filtres.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {visibleGroups.map((group) => (
                <SlotOccupancySiteGroupCard
                  key={group.siteId}
                  group={group}
                  expanded={expandedIds.has(group.siteId)}
                  onExpandedChange={(expanded) => {
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      if (expanded) next.add(group.siteId);
                      else next.delete(group.siteId);
                      return next;
                    });
                  }}
                  onOpenSlot={setSelected}
                  canManageEnrollments={canManageEnrollments}
                  busySlotId={busySlotId}
                  onToggleEnrollments={onToggleEnrollments}
                />
              ))}
            </Stack>
          )}
        </Stack>
      )}
      <SlotOccupancyEnrolledDrawer
        slot={selected}
        onClose={() => setSelected(null)}
        canManageEnrollments={canManageEnrollments}
        enrollmentsBusy={selected != null && busySlotId === selected.slotId}
        onToggleEnrollments={onToggleEnrollments}
      />
    </Container>
  );
}
