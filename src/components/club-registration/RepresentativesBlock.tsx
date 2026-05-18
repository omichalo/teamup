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
  /**
   * Helpers de validation onBlur fournis par le parent. Si non fournis, les
   * champs sont considérés comme déjà "touchés" pour conserver le
   * comportement historique (affichage de l'erreur dès le format invalide).
   */
  isTouched?: (field: string) => boolean;
  markTouched?: (field: string) => void;
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
  isTouched,
  markTouched,
}: Props) {
  const touched = isTouched ?? (() => true);
  const mark = markTouched ?? (() => {});
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
        const emailField = `representatives.${index}.email`;
        const phoneField = `representatives.${index}.phone`;
        const phoneFormatInvalid =
          rep.phone.trim() !== "" && !isValidFrenchPhoneSurface(rep.phone);
        const phoneRequiredMissing = required && rep.phone.trim() === "";
        const showPhoneError =
          touched(phoneField) && (phoneFormatInvalid || phoneRequiredMissing);
        const phoneHelperText = phoneFormatInvalid
          ? "Numéro français invalide."
          : phoneRequiredMissing
            ? "Téléphone obligatoire pour le représentant légal."
            : undefined;

        const emailFormatInvalid = isInvalidEmail(rep.email);
        const emailRequiredMissing = required && rep.email.trim() === "";
        const showEmailError =
          touched(emailField) && (emailFormatInvalid || emailRequiredMissing);
        const emailHelperText = emailFormatInvalid
          ? "Adresse e-mail invalide."
          : emailRequiredMissing
            ? "E-mail obligatoire pour le représentant légal."
            : index === 0
              ? "Contact principal du club pour ce dossier."
              : "Le club pourra aussi utiliser cette adresse pour le suivi du dossier.";

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
                  label={
                    index === 0
                      ? "E-mail du représentant légal principal"
                      : "E-mail du second représentant"
                  }
                  type="email"
                  value={rep.email}
                  onChange={handleField(index, "email")}
                  onBlur={() => mark(emailField)}
                  fullWidth
                  autoComplete="off"
                  error={showEmailError}
                  helperText={emailHelperText}
                />

                <TextField
                  required={required}
                  label="Téléphone"
                  value={toFrenchPhoneMaskedDisplay(rep.phone)}
                  onChange={handlePhone(index)}
                  onBlur={() => mark(phoneField)}
                  fullWidth
                  inputMode="numeric"
                  placeholder="06 12 34 56 78"
                  autoComplete="off"
                  error={showPhoneError}
                  helperText={showPhoneError ? phoneHelperText : undefined}
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
