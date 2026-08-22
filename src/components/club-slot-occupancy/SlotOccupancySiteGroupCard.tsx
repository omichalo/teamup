"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { occupancyGroupStats } from "@/lib/club-slot-occupancy/filter-groups";
import type { SlotOccupancySiteGroup, SlotOccupancySummary } from "@/lib/club-slot-occupancy/types";
import { SlotFillStatusChip } from "./SlotFillStatusChip";
import { SlotOccupancyRow } from "./SlotOccupancyRow";

type Props = {
  group: SlotOccupancySiteGroup;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onOpenSlot: (slot: SlotOccupancySummary) => void;
  canManageEnrollments: boolean;
  busySlotId: string | null;
  onToggleEnrollments: (slot: SlotOccupancySummary) => void | Promise<void>;
};

function creneauxLabel(count: number): string {
  return `${count} créneau${count > 1 ? "x" : ""}`;
}

export function SlotOccupancySiteGroupCard({
  group,
  expanded,
  onExpandedChange,
  onOpenSlot,
  canManageEnrollments,
  busySlotId,
  onToggleEnrollments,
}: Props) {
  const stats = occupancyGroupStats(group);
  const summaryId = `occupancy-site-${group.siteId}`;

  return (
    <Accordion
      disableGutters
      expanded={expanded}
      onChange={(_, next) => onExpandedChange(next)}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${summaryId}-content`}
        id={summaryId}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: "100%", pr: 1 }}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography fontWeight={600}>{group.siteLabel}</Typography>
            <Typography variant="body2" color="text.secondary">
              {[group.gymnasiumName, creneauxLabel(stats.total)].filter(Boolean).join(" · ")}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end">
            {stats.enrollmentsClosed > 0 ? (
              <Chip
                size="small"
                color="warning"
                label={`${stats.enrollmentsClosed} fermé${stats.enrollmentsClosed > 1 ? "s" : ""}`}
              />
            ) : null}
            {stats.over > 0 ? (
              <SlotFillStatusChip
                status="over"
                label={`${stats.over} surcharge${stats.over > 1 ? "s" : ""}`}
              />
            ) : null}
            {stats.full > 0 ? (
              <SlotFillStatusChip
                status="full"
                label={`${stats.full} complet${stats.full > 1 ? "s" : ""}`}
              />
            ) : null}
            {stats.near > 0 ? (
              <SlotFillStatusChip
                status="near"
                label={`${stats.near} presque complet${stats.near > 1 ? "s" : ""}`}
              />
            ) : null}
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {group.slots.length === 0 ? (
          <Typography color="text.secondary">Aucun créneau sur ce lieu.</Typography>
        ) : (
          <Stack spacing={1.25}>
            {group.slots.map((slot) => (
              <SlotOccupancyRow
                key={slot.slotId}
                slot={slot}
                onOpen={onOpenSlot}
                canManageEnrollments={canManageEnrollments}
                enrollmentsBusy={busySlotId === slot.slotId}
                onToggleEnrollments={onToggleEnrollments}
              />
            ))}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
