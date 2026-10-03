"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import type { MemberProfileSlot } from "@/lib/member-profile/types";
import { MemberProfileSection } from "./MemberProfileSection";

type Props = {
  slots: MemberProfileSlot[];
};

export function MemberSlotsSection({ slots }: Props) {
  return (
    <MemberProfileSection
      title="Créneaux"
      subtitle={
        slots.length === 0
          ? "Aucun créneau associé"
          : `${slots.length} créneau${slots.length > 1 ? "x" : ""} d'inscription`
      }
      icon={ScheduleIcon}
    >
      {slots.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun créneau n&apos;est rattaché à ce dossier pour le moment.
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {slots.map((slot) => (
            <Chip
              key={slot.slotId}
              label={slot.label}
              color="primary"
              variant="outlined"
              sx={{
                height: "auto",
                py: 1,
                px: 0.5,
                borderRadius: 2,
                "& .MuiChip-label": {
                  whiteSpace: "normal",
                  lineHeight: 1.35,
                },
              }}
            />
          ))}
        </Stack>
      )}
      {slots.length > 0 ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Créneaux choisis lors de l&apos;adhésion pour la saison en cours.
          </Typography>
        </Box>
      ) : null}
    </MemberProfileSection>
  );
}
