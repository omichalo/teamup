"use client";

import { Button, Chip, Stack, Typography } from "@mui/material";
import {
  ATTENDANCE_LEAD_STATUSES,
  ATTENDANCE_LEAD_STATUS_LABELS,
  type AttendanceLeadStatus,
} from "@/lib/attendance/constants";
import type { AttendanceLeadListItem } from "@/lib/attendance/types";

type Props = {
  lead: AttendanceLeadListItem;
  busy: boolean;
  onPatchStatus: (id: string, next: AttendanceLeadStatus) => void;
};

function formatVisitDate(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function visitCountLabel(count: number): string {
  return count <= 1 ? `${count} essai` : `${count} essais`;
}

export function AttendanceLeadCard({ lead, busy, onPatchStatus }: Props) {
  return (
    <Stack spacing={1} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap">
        <Typography variant="h6">
          {lead.firstName} {lead.lastName}
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={visitCountLabel(lead.visitCount)} size="small" variant="outlined" />
          <Chip label={ATTENDANCE_LEAD_STATUS_LABELS[lead.status]} size="small" />
        </Stack>
      </Stack>
      <Typography color="text.secondary">
        {lead.phone}
        {lead.email ? ` · ${lead.email}` : ""}
      </Typography>
      {lead.visits.length > 0 ? (
        <Stack spacing={0.5} component="ul" sx={{ m: 0, pl: 2 }}>
          {lead.visits.map((visit) => (
            <Typography
              key={`${visit.date}-${visit.slotId}`}
              component="li"
              variant="body2"
              color="text.secondary"
            >
              {formatVisitDate(visit.date)} · {visit.slotLabel}
            </Typography>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Aucune séance d&apos;essai enregistrée.
        </Typography>
      )}
      <Stack direction="row" gap={1} flexWrap="wrap">
        {ATTENDANCE_LEAD_STATUSES.filter((value) => value !== lead.status).map((value) => (
          <Button
            key={value}
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={() => onPatchStatus(lead.id, value)}
          >
            {ATTENDANCE_LEAD_STATUS_LABELS[value]}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}
