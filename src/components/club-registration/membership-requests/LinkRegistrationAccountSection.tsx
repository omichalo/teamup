"use client";

import { useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { isClubRegistrationManager } from "@/lib/club-registration/registration-access";
import { effectiveLinkedAccountEmails } from "@/lib/club-registration/effective-linked-accounts";
import { resolveRole } from "@/lib/auth/roles";
import { DetailSectionTitle } from "./DetailSectionTitle";
import { LinkRegistrationAccountDialog } from "./LinkRegistrationAccountDialog";

type Props = {
  registrationId: string;
  adherentDisplayName: string;
  submitterUid?: string | null | undefined;
  submitterAccountEmail?: string | null | undefined;
  submitterRole?: string | null | undefined;
  linkedAccountUids?: string[] | undefined;
  linkedAccountEmails?: string[] | undefined;
  disabled?: boolean;
  onLinked: () => void | Promise<void>;
};

function isStaffSubmitter(submitterRole: string | null | undefined): boolean {
  if (!submitterRole) return false;
  return isClubRegistrationManager(resolveRole(submitterRole));
}

/** Dossier saisi par le club, encore rattaché uniquement au compte club. */
function isOrphanStaffDossier(params: {
  submitterRole?: string | null | undefined;
  submitterUid?: string | null | undefined;
  linkedAccountUids?: string[] | undefined;
}): boolean {
  if (!isStaffSubmitter(params.submitterRole)) return false;
  const submitterUid = params.submitterUid?.trim() || "";
  const linked = Array.isArray(params.linkedAccountUids)
    ? params.linkedAccountUids.filter((uid) => typeof uid === "string" && uid.length > 0)
    : null;
  if (linked === null) return true;
  if (linked.length === 0) return true;
  return linked.every((uid) => uid === submitterUid);
}

export function LinkRegistrationAccountSection({
  registrationId,
  adherentDisplayName,
  submitterUid,
  submitterAccountEmail,
  submitterRole,
  linkedAccountUids,
  linkedAccountEmails,
  disabled = false,
  onLinked,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const needsMemberAccess = isOrphanStaffDossier({
    submitterRole,
    submitterUid,
    linkedAccountUids,
  });
  const accessEmails = effectiveLinkedAccountEmails({
    linkedAccountEmails,
    linkedAccountUids,
    submitterAccountEmail,
    submitterUid,
  });
  const accessLabel = accessEmails.join(", ");

  return (
    <>
      <DetailSectionTitle>Accès en ligne</DetailSectionTitle>
      <Stack spacing={1.5}>
        {needsMemberAccess ? (
          <Alert severity="warning">
            Ce dossier a été saisi par le club. L&apos;adhérent ne peut pas encore le voir
            dans Mes dossiers ni payer en ligne. Donnez l&apos;accès à son compte TeamUp
            (il doit d&apos;abord s&apos;être inscrit sur l&apos;application).
          </Alert>
        ) : (
          <Alert severity="info">
            Compte TeamUp qui peut consulter ce dossier, télécharger les factures et payer
            en ligne. Vous pouvez le changer si l&apos;adhérent utilise une autre adresse.
          </Alert>
        )}
        {accessLabel && !needsMemberAccess ? (
          <Typography variant="body2" color="text.secondary">
            Compte actuel : <strong>{accessLabel}</strong>
          </Typography>
        ) : null}
        <Button
          variant="outlined"
          startIcon={<ManageAccountsIcon />}
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
          sx={{ alignSelf: "flex-start" }}
        >
          {needsMemberAccess ? "Donner l'accès à l'adhérent" : "Modifier le compte d'accès"}
        </Button>
      </Stack>
      <LinkRegistrationAccountDialog
        open={dialogOpen}
        registrationId={registrationId}
        adherentDisplayName={adherentDisplayName}
        mode={needsMemberAccess ? "grant" : "change"}
        currentAccessEmails={needsMemberAccess ? [] : accessEmails}
        onClose={() => setDialogOpen(false)}
        onLinked={onLinked}
      />
    </>
  );
}
