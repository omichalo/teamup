"use client";

import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { OpenMemberProfileLink } from "@/components/member-profile/OpenMemberProfileLink";
import { registrationStatusChipProps } from "./membership-request-detail-shared";

type Props = {
  registrationId: string;
  firstName: string;
  lastName: string;
  status: string | undefined;
  hideTitleHeader?: boolean;
};

export function MembershipRequestDetailHeader({
  registrationId,
  firstName,
  lastName,
  status,
  hideTitleHeader = false,
}: Props) {
  const headerStatusChip = registrationStatusChipProps(status);

  if (hideTitleHeader) {
    return (
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          Référence : {registrationId}
        </Typography>
        <OpenMemberProfileLink registrationId={registrationId} />
      </Stack>
    );
  }

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {formatPersonDisplayName(firstName, lastName)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Référence : {registrationId}
          </Typography>
          <OpenMemberProfileLink registrationId={registrationId} />
        </Box>
        <Chip label={headerStatusChip.label} color={headerStatusChip.color} />
      </Stack>
      <Divider />
    </>
  );
}
