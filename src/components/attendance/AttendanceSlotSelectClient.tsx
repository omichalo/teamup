"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Stack, TextField, Typography } from "@mui/material";
import { PageHeader } from "@/components/ui";
import { todayYmdInParis } from "@/lib/attendance/calendar";
import { attendanceSessionHref, readAttendanceDateParam } from "@/lib/attendance/urls";
import { useAttendanceSlots } from "./useAttendanceSlots";
import { AttendanceSlotPicker } from "./AttendanceSlotPicker";

export function AttendanceSlotSelectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = readAttendanceDateParam(searchParams.get("date"), todayYmdInParis());
  const { slots, loading, error } = useAttendanceSlots(date);

  useEffect(() => {
    if (!searchParams.get("date")) {
      router.replace(`/club/presences?date=${encodeURIComponent(date)}`);
    }
  }, [date, router, searchParams]);

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
        <Typography variant="subtitle2" color="text.secondary">
          Créneaux du jour
        </Typography>
        <AttendanceSlotPicker
          slots={slots}
          loading={loading}
          error={error}
          selectedSlotId={null}
          onSelect={(slotId) => router.push(attendanceSessionHref(date, slotId))}
        />
      </Stack>
    </Container>
  );
}
