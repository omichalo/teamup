"use client";

import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { CLUB_REGISTRATION_EXTERNAL_LINKS } from "@/lib/club-registration/constants";
import { isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

/**
 * Étape 6 — « Engagements à signer ».
 *
 * Concentre tout ce qui constitue un consentement ou une signature
 * juridiquement opposable :
 * - diffusion d'images ;
 * - autorisations d'actes médicaux d'urgence et de prise en charge à l'heure
 *   des cours (uniquement pour les mineurs) ;
 * - acceptation du règlement intérieur.
 *
 * L'extension compétiteur (taille de maillot, compétitions) a été déplacée
 * vers l'étape « Pratique sportive » : c'est un choix de pratique, pas un
 * engagement.
 */
export function EngagementsStep({ draft, onChange }: Props) {
  const isMinor = isMinorAt(draft.birthDate);

  return (
    <Stack spacing={3}>
      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700 }}
      >
        Diffusion d’images
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Le club diffuse informations et photos sur{" "}
        <a
          href={CLUB_REGISTRATION_EXTERNAL_LINKS.siteClub}
          target="_blank"
          rel="noreferrer"
        >
          sqyping.fr
        </a>{" "}
        et sur ses réseaux sociaux. Le RGPD impose un consentement explicite ;
        ce choix peut être modifié à tout moment par simple demande auprès du
        club.
      </Typography>
      <FormControl component="fieldset" required>
        <Typography
          variant="subtitle2"
          gutterBottom
          id="photo-consent-label"
        >
          Acceptez-vous une diffusion d&apos;images à caractère sportif vous
          concernant (ou votre enfant mineur)&nbsp;?
        </Typography>
        <RadioGroup
          aria-labelledby="photo-consent-label"
          name="photoConsent"
          value={draft.photoConsent}
          onChange={(e) =>
            onChange({
              photoConsent: e.target
                .value as RegistrationDraft["photoConsent"],
            })
          }
        >
          <FormControlLabel
            value="accept"
            control={<Radio />}
            label="J’accepte"
          />
          <FormControlLabel
            value="refuse"
            control={<Radio />}
            label="Je refuse"
          />
        </RadioGroup>
      </FormControl>

      {isMinor ? (
        <>
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
          >
            Autorisations pour l’adhérent mineur
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ces deux autorisations sont obligatoires pour l’inscription d’un
            mineur. Elles ne sont pas affichées si l’adhérent est majeur.
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
                  J’autorise les actes médicaux ou chirurgicaux en urgence pour
                  mon enfant mineur.
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
                  Je m’engage à ce que mon enfant soit pris en charge par le
                  responsable à l’heure des cours.
                </Typography>
              }
            />
          </Box>
        </>
      ) : null}

      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
      >
        Règlement intérieur
      </Typography>
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
            , et je reconnais que les données nécessaires à la licence sont
            transmises à la FFTT conformément aux usages du club.
          </Typography>
        }
      />
    </Stack>
  );
}
