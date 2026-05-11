"use client";

import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import {
  COMPETITION_OPTIONS,
  CLUB_REGISTRATION_EXTERNAL_LINKS,
  JERSEY_SIZES,
} from "@/lib/club-registration/constants";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

export function LegalCompetitorStep({ draft, onChange }: Props) {
  const toggleCompetition = (id: (typeof COMPETITION_OPTIONS)[number]["id"]) => {
    const set = new Set(draft.competitionIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ competitionIds: Array.from(set) });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">Image et communication</Typography>
      <Typography variant="body2" color="text.secondary">
        Le club diffuse informations et photos sur{" "}
        <a href={CLUB_REGISTRATION_EXTERNAL_LINKS.siteClub} target="_blank" rel="noreferrer">
          sqyping.fr
        </a>{" "}
        et les réseaux sociaux.
      </Typography>
      <FormControl component="fieldset">
        <Typography variant="subtitle2" gutterBottom>
          Acceptez-vous une diffusion d&apos;images à caractère sportif vous concernant (ou votre
          enfant mineur) ?
        </Typography>
        <RadioGroup
          value={draft.photoConsent}
          onChange={(e) =>
            onChange({
              photoConsent: e.target.value as RegistrationDraft["photoConsent"],
            })
          }
        >
          <FormControlLabel value="accept" control={<Radio />} label="J&apos;accepte" />
          <FormControlLabel value="refuse" control={<Radio />} label="Je refuse" />
        </RadioGroup>
      </FormControl>

      <Typography variant="subtitle1">Mineurs — autorisations</Typography>
      <FormControl component="fieldset">
        <Typography variant="subtitle2" gutterBottom>
          Autorisation d&apos;actes médicaux ou chirurgicaux en urgence pour mon enfant mineur (à
          défaut : adhérent majeur non concerné).
        </Typography>
        <RadioGroup
          value={draft.emergencyMedicalAuthorization}
          onChange={(e) =>
            onChange({
              emergencyMedicalAuthorization: e.target
                .value as RegistrationDraft["emergencyMedicalAuthorization"],
            })
          }
        >
          <FormControlLabel value="yes" control={<Radio />} label="Oui" />
          <FormControlLabel
            value="not_applicable_adult"
            control={<Radio />}
            label="Adhérent majeur — non concerné"
          />
        </RadioGroup>
      </FormControl>

      <FormControl component="fieldset">
        <Typography variant="subtitle2" gutterBottom>
          Je m&apos;engage à ce que mon enfant soit pris en charge par le responsable à l&apos;heure
          des cours (sinon : adhérent majeur non concerné).
        </Typography>
        <RadioGroup
          value={draft.supervisionAcknowledgement}
          onChange={(e) =>
            onChange({
              supervisionAcknowledgement: e.target
                .value as RegistrationDraft["supervisionAcknowledgement"],
            })
          }
        >
          <FormControlLabel value="yes" control={<Radio />} label="Oui" />
          <FormControlLabel
            value="not_applicable_adult"
            control={<Radio />}
            label="Adhérent majeur — non concerné"
          />
        </RadioGroup>
      </FormControl>

      <FormControlLabel
        control={
          <Checkbox
            checked={draft.rulesAccepted}
            onChange={(e) => onChange({ rulesAccepted: e.target.checked })}
          />
        }
        label={
          <Typography variant="body2" component="span">
            J&apos;ai lu et j&apos;accepte le{" "}
            <a
              href={CLUB_REGISTRATION_EXTERNAL_LINKS.reglementInterieur}
              target="_blank"
              rel="noreferrer"
            >
              règlement intérieur
            </a>
            , et je reconnais que les données nécessaires à la licence sont transmises à la FFTT
            conformément aux usages du club.
          </Typography>
        }
      />

      <Stack spacing={1}>
        <FormControlLabel
          control={
            <Switch
              checked={draft.wantsCompetitorExtras}
              onChange={(e) => onChange({ wantsCompetitorExtras: e.target.checked })}
            />
          }
          label="Section compétiteur : taille de maillot et compétitions"
        />

        {draft.wantsCompetitorExtras && (
          <>
            <FormControl fullWidth required={draft.wantsCompetitorExtras}>
              <InputLabel id="jersey-label">Taille de maillot de compétition</InputLabel>
              <Select
                labelId="jersey-label"
                label="Taille de maillot de compétition"
                value={draft.competitionJerseySize ?? ""}
                onChange={(e) =>
                  onChange({
                    competitionJerseySize: e.target.value as RegistrationDraft["competitionJerseySize"],
                  })
                }
              >
                <MenuItem value="">
                  <em>Choisir…</em>
                </MenuItem>
                {JERSEY_SIZES.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2">Compétitions envisagées</Typography>
            <FormGroup>
              {COMPETITION_OPTIONS.map((c) => (
                <FormControlLabel
                  key={c.id}
                  control={
                    <Checkbox
                      checked={draft.competitionIds.includes(c.id)}
                      onChange={() => toggleCompetition(c.id)}
                    />
                  }
                  label={c.label}
                />
              ))}
            </FormGroup>
          </>
        )}
      </Stack>
    </Stack>
  );
}
