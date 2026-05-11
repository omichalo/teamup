"use client";

import type { ChangeEvent } from "react";
import {
  Button,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  extractNationalDigitsForMask,
  formatFrenchPhoneMask,
  isValidFrenchPhoneSurface,
  toFrenchPhoneMaskedDisplay,
} from "@/lib/club-registration/phone-fr";
import type { Representative } from "@/lib/club-registration/schema";

type Props = {
  representatives: Representative[];
  /** Si vrai, le 1er représentant est obligatoire et non supprimable. */
  firstIsRequired: boolean;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<Representative>) => void;
  onRemove: (index: number) => void;
};

const ROLE_OPTIONS: Array<{ value: Representative["role"]; label: string }> = [
  { value: "mother", label: "Mère" },
  { value: "father", label: "Père" },
  { value: "guardian", label: "Tuteur / Tutrice légal(e)" },
  { value: "self", label: "Adhérent(e) lui/elle-même" },
  { value: "other", label: "Autre" },
];

function isInvalidEmail(value: string): boolean {
  if (value.trim() === "") return false;
  return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function RepresentativesBlock({
  representatives,
  firstIsRequired,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const handleField =
    (index: number, field: keyof Representative) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      onUpdate(index, { [field]: e.target.value } as Partial<Representative>);
    };

  const handleRole =
    (index: number) =>
    (e: SelectChangeEvent<Representative["role"]>) => {
      onUpdate(index, { role: e.target.value as Representative["role"] });
    };

  const handlePhone =
    (index: number) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const digits = extractNationalDigitsForMask(e.target.value);
      onUpdate(index, { phone: formatFrenchPhoneMask(digits) });
    };

  return (
    <Stack spacing={2}>
      {representatives.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun représentant légal pour ce dossier.
        </Typography>
      ) : null}

      {representatives.map((rep, index) => {
        const removable = !(firstIsRequired && index === 0);
        const required = firstIsRequired && index === 0;
        const phoneInvalid =
          rep.phone.trim() !== "" && !isValidFrenchPhoneSurface(rep.phone);
        const emailInvalid = isInvalidEmail(rep.email);

        return (
          <Card key={index} variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2">
                    Représentant légal {index + 1}
                    {required ? " (obligatoire)" : " (optionnel)"}
                  </Typography>
                  {removable ? (
                    <Tooltip title="Supprimer ce représentant">
                      <IconButton
                        aria-label={`Supprimer le représentant ${index + 1}`}
                        size="small"
                        onClick={() => onRemove(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>

                <FormControl fullWidth>
                  <InputLabel id={`rep-role-label-${index}`}>Lien avec l’adhérent</InputLabel>
                  <Select
                    labelId={`rep-role-label-${index}`}
                    label="Lien avec l’adhérent"
                    value={rep.role}
                    onChange={handleRole(index)}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    required={required}
                    label="Prénom"
                    value={rep.firstName}
                    onChange={handleField(index, "firstName")}
                    fullWidth
                    autoComplete="off"
                  />
                  <TextField
                    required={required}
                    label="Nom"
                    value={rep.lastName}
                    onChange={handleField(index, "lastName")}
                    fullWidth
                    autoComplete="off"
                  />
                </Stack>

                <TextField
                  required={required}
                  label="E-mail"
                  type="email"
                  value={rep.email}
                  onChange={handleField(index, "email")}
                  fullWidth
                  autoComplete="off"
                  error={emailInvalid}
                  helperText={emailInvalid ? "Adresse e-mail invalide" : undefined}
                />

                <TextField
                  required={required}
                  label="Téléphone"
                  value={toFrenchPhoneMaskedDisplay(rep.phone)}
                  onChange={handlePhone(index)}
                  fullWidth
                  inputMode="numeric"
                  placeholder="06 12 34 56 78"
                  autoComplete="off"
                  error={phoneInvalid}
                  helperText={phoneInvalid ? "Numéro invalide" : undefined}
                />
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      {representatives.length < 2 ? (
        <Stack direction="row">
          <Button variant="outlined" size="small" onClick={onAdd}>
            + Ajouter un représentant légal
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
