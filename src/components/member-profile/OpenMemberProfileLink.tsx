"use client";

import { Button } from "@mui/material";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import Link from "next/link";
import { buildMemberProfileHref } from "@/lib/member-profile/urls";

type Props = {
  registrationId: string;
  label?: string;
};

export function OpenMemberProfileLink({
  registrationId,
  label = "Voir la fiche adhérent",
}: Props) {
  return (
    <Button
      component={Link}
      href={buildMemberProfileHref(registrationId)}
      size="small"
      startIcon={<PersonSearchIcon />}
      sx={{ alignSelf: "flex-start", px: 0 }}
    >
      {label}
    </Button>
  );
}
