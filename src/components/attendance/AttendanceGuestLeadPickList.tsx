"use client";

import { Button, Stack, Typography } from "@mui/material";
import type { AttendanceLeadSearchHit } from "@/lib/attendance/types";

type Props = {
  leads: AttendanceLeadSearchHit[];
  busyId: string | null;
  emptyLabel: string;
  onPick: (lead: AttendanceLeadSearchHit) => void;
};

function visitCountLabel(count: number): string {
  return count <= 1 ? `${count} essai` : `${count} essais`;
}

export function AttendanceGuestLeadPickList({
  leads,
  busyId,
  emptyLabel,
  onPick,
}: Props) {
  if (leads.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {leads.map((lead) => (
        <Stack
          key={lead.leadId}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          sx={{
            p: 1.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            opacity: lead.alreadyPresent ? 0.55 : 1,
          }}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {lead.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {lead.phone}
              {` · ${visitCountLabel(lead.visitCount)}`}
              {lead.lastVisitDate ? ` · vu le ${lead.lastVisitDate}` : ""}
            </Typography>
          </Stack>
          {lead.alreadyPresent ? (
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              Déjà pointé
            </Typography>
          ) : (
            <Button
              variant="contained"
              size="small"
              disabled={busyId === lead.leadId}
              onClick={() => onPick(lead)}
              sx={{ minHeight: 40, flexShrink: 0 }}
            >
              Présent
            </Button>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
