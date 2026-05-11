"use client";

import {
  Alert,
  Box,
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
import { isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationDraft } from "./registration-defaults";

const ADAPTED_SECTIONS = new Set(["handisport", "sport-adapte"]);

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

  /* Les autorisations « actes médicaux d'urgence » et « prise en charge à l'heure
     des cours » sont strictement pertinentes pour un mineur : un majeur n'a pas
     à se prononcer dessus. On les masque et on délègue au wizard la responsabilité
     de poser `not_applicable_adult` au moment du build du payload. */
  const isMinor = isMinorAt(draft.birthDate);

  return (
    <Stack spacing={2}>
      <Typography
        variant="subtitle1"
        sx={{ color: "primary.main", fontWeight: 700 }}
      >
        Image et communication
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Le club diffuse informations et photos sur{" "}
        <a href={CLUB_REGISTRATION_EXTERNAL_LINKS.siteClub} target="_blank" rel="noreferrer">
          sqyping.fr
        </a>{" "}
        et les réseaux sociaux.
      </Typography>
      <FormControl component="fieldset" required>
        <Typography variant="subtitle2" gutterBottom id="photo-consent-label">
          Acceptez-vous une diffusion d&apos;images à caractère sportif vous concernant (ou votre
          enfant mineur) ?
        </Typography>
        <RadioGroup
          aria-labelledby="photo-consent-label"
          name="photoConsent"
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

      {isMinor ? (
        <>
          <Typography
            variant="subtitle1"
            sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
          >
            Autorisations pour l’adhérent mineur
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ces deux autorisations sont obligatoires pour l’inscription d’un mineur. Elles ne
            sont pas affichées si l’adhérent est majeur.
          </Typography>
          <Box data-field="emergencyMedicalAuthorization" tabIndex={-1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={draft.emergencyMedicalAuthorization === "yes"}
                  onChange={(e) =>
                    onChange({
                      emergencyMedicalAuthorization: e.target.checked
                        ? "yes"
                        : "not_applicable_adult",
                    })
                  }
                />
              }
              label={
                <Typography variant="body2" component="span">
                  J’autorise les actes médicaux ou chirurgicaux en urgence pour mon enfant
                  mineur.
                </Typography>
              }
            />
          </Box>
          <Box data-field="supervisionAcknowledgement" tabIndex={-1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={draft.supervisionAcknowledgement === "yes"}
                  onChange={(e) =>
                    onChange({
                      supervisionAcknowledgement: e.target.checked
                        ? "yes"
                        : "not_applicable_adult",
                    })
                  }
                />
              }
              label={
                <Typography variant="body2" component="span">
                  Je m’engage à ce que mon enfant soit pris en charge par le responsable à
                  l’heure des cours.
                </Typography>
              }
            />
          </Box>
        </>
      ) : null}

      <FormControlLabel
        data-field="internalRulesAccepted"
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
        {ADAPTED_SECTIONS.has(draft.mainSectionId) ? (
          <Alert severity="info">
            La section compétiteur classique (maillot, championnats fédéraux) ne s’applique pas
            aux sections handisport et sport adapté. L’option « Compétition handisport » reste
            disponible dans les compétitions, sans extension compétiteur.
          </Alert>
        ) : (
          <FormControlLabel
            data-field="wantsCompetitorExtras"
            control={
              <Switch
                checked={draft.wantsCompetitorExtras}
                onChange={(e) => onChange({ wantsCompetitorExtras: e.target.checked })}
              />
            }
            label="Section compétiteur : taille de maillot et compétitions"
          />
        )}

        {!ADAPTED_SECTIONS.has(draft.mainSectionId) && draft.wantsCompetitorExtras && (
          <>
            <FormControl fullWidth required={draft.wantsCompetitorExtras}>
              <InputLabel id="jersey-label">Taille de maillot de compétition</InputLabel>
              <Select
                labelId="jersey-label"
                label="Taille de maillot de compétition"
                name="competitionJerseySize"
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

            <Typography
              variant="subtitle2"
              data-field="competitionIds"
              tabIndex={-1}
            >
              Compétitions envisagées
            </Typography>
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
