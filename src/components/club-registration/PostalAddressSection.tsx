"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AddressBanSearch } from "./AddressBanSearch";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

function hasAnyAddressValue(d: RegistrationDraft): boolean {
  return (
    d.addressLine1.trim().length > 0 ||
    d.postalCode.trim().length > 0 ||
    d.city.trim().length > 0 ||
    (d.addressLine2 ?? "").trim().length > 0
  );
}

export function PostalAddressSection({ draft, onChange }: Props) {
  const [manualMode, setManualMode] = useState(false);
  const [filledViaBan, setFilledViaBan] = useState(false);

  const persistedOrEditedAddress = hasAnyAddressValue(draft);
  const showDetailFields = manualMode || filledViaBan || persistedOrEditedAddress;

  const handleBanSelect = (a: { addressLine1: string; postalCode: string; city: string }) => {
    onChange({
      addressLine1: a.addressLine1,
      postalCode: a.postalCode,
      city: a.city,
    });
    setFilledViaBan(true);
    setManualMode(false);
  };

  const handleSwitchToManual = () => {
    setManualMode(true);
  };

  const handleSwitchToSearch = () => {
    setManualMode(false);
  };

  return (
    <Stack component="section" spacing={2} aria-labelledby="club-registration-postal-heading">
      <Typography id="club-registration-postal-heading" variant="subtitle1" component="h3">
        Adresse postale
      </Typography>

      {!manualMode ? (
        <Box>
          <AddressBanSearch
            onAddressSelected={handleBanSelect}
            label="Rechercher votre adresse"
            placeholder="Ex. 12 rue Victor Hugo, Paris"
            helperText="Recherchez votre adresse dans la Base Adresse Nationale. Vous pourrez la compléter ensuite."
          />
          <Button
            type="button"
            variant="text"
            size="small"
            onClick={handleSwitchToManual}
            sx={{ alignSelf: "flex-start", mt: 1, textTransform: "none" }}
          >
            Mon adresse n&apos;apparaît pas — saisir l&apos;adresse manuellement
          </Button>
        </Box>
      ) : (
        <Stack spacing={1}>
          <Button
            type="button"
            variant="text"
            size="small"
            onClick={handleSwitchToSearch}
            sx={{ alignSelf: "flex-start", textTransform: "none" }}
          >
            Rechercher une adresse officielle
          </Button>
        </Stack>
      )}

      <Collapse in={showDetailFields} timeout={{ enter: 400, exit: 260 }}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {filledViaBan && !manualMode ? (
            <Typography variant="subtitle2" color="text.secondary">
              Adresse sélectionnée
            </Typography>
          ) : null}

          <TextField
            required
            label="Rue et numéro"
            value={draft.addressLine1}
            onChange={(e) => onChange({ addressLine1: e.target.value })}
            fullWidth
            name="clubRegistrationAddressLine1"
            autoComplete="section-club-residence street-address"
          />
          <TextField
            label="Complément d’adresse"
            value={draft.addressLine2 ?? ""}
            onChange={(e) => onChange({ addressLine2: e.target.value })}
            fullWidth
            name="clubRegistrationAddressLine2"
            autoComplete="section-club-residence address-line2"
            helperText="Étage, bâtiment, résidence, appartement…"
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              required
              label="Code postal"
              value={draft.postalCode}
              onChange={(e) => onChange({ postalCode: e.target.value })}
              fullWidth
              name="clubRegistrationPostalCode"
              autoComplete="section-club-residence postal-code"
              inputProps={{ inputMode: "numeric", maxLength: 5 }}
            />
            <TextField
              required
              label="Ville"
              value={draft.city}
              onChange={(e) => onChange({ city: e.target.value })}
              fullWidth
              name="clubRegistrationCity"
              autoComplete="section-club-residence address-level2"
            />
          </Stack>
        </Stack>
      </Collapse>
    </Stack>
  );
}
