"use client";

import { Button, Stack, Typography } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { CLUB_REGISTRATION_DOCUMENTS } from "@/lib/club-registration/constants";
import { MemberProfileSection } from "./MemberProfileSection";

/** Documents club accessibles depuis la fiche adhérent (règlement, etc.). */
export function MemberClubDocumentsSection() {
  return (
    <MemberProfileSection
      title="Documents du club"
      subtitle="Références utiles hors justificatifs de paiement"
      icon={DescriptionOutlinedIcon}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Typography variant="body2" color="text.secondary">
          Règlement intérieur de SQY Ping
        </Typography>
        <Button
          component="a"
          href={CLUB_REGISTRATION_DOCUMENTS.reglementInterieur}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          endIcon={<OpenInNewIcon />}
          sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
        >
          Ouvrir le règlement
        </Button>
      </Stack>
    </MemberProfileSection>
  );
}
