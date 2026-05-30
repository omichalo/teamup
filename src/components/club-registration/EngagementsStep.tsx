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
        Le club SQY PING diffuse sur{" "}
        <a
          href={CLUB_REGISTRATION_EXTERNAL_LINKS.siteClub}
          target="_blank"
          rel="noreferrer"
        >
          sqyping.fr
        </a>{" "}
        et sur ses réseaux sociaux des informations, résultats et photographies
        à caractère sportif.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Conformément au RGPD, indiquez ci-dessous si vous acceptez ou refusez
        la diffusion de votre image, ou de celle de l&apos;enfant mineur que
        vous inscrivez. Ce choix peut être modifié à tout moment en contactant
        le club.
      </Typography>
      <FormControl component="fieldset" required>
        <Typography
          variant="subtitle2"
          gutterBottom
          id="photo-consent-label"
        >
          Acceptez-vous cette diffusion d&apos;images&nbsp;?
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
            label="J’accepte la diffusion de mon image / de celle de mon enfant mineur"
          />
          <FormControlLabel
            value="refuse"
            control={<Radio />}
            label="Je refuse la diffusion de mon image / de celle de mon enfant mineur"
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
                  En cochant cette case, j&apos;autorise tout dirigeant ou
                  responsable de l&apos;association SQY PING à donner en mon
                  nom, lieu et place toute autorisation nécessaire pour tout
                  acte médical ou chirurgical qui, le cas échéant, serait à
                  effectuer en urgence par le corps médical, concernant mon
                  enfant.
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
                  En cochant cette case, je m&apos;engage à vérifier que, à
                  l&apos;heure des cours, mon enfant est bien pris en charge par
                  le responsable de l&apos;association SQY PING. Mon enfant sera
                  alors sous la responsabilité de l&apos;association jusqu&apos;à
                  l&apos;heure de fin du créneau d&apos;entrainement
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
          <Typography variant="body2" component="span" sx={{ display: "block" }}>
            En cochant cette case, je reconnais approuver sans dérogation les
            points suivants&nbsp;:
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              <Box component="li" sx={{ mb: 0.5 }}>
                Le{" "}
                <a
                  href={CLUB_REGISTRATION_EXTERNAL_LINKS.reglementInterieur}
                  target="_blank"
                  rel="noreferrer"
                >
                  règlement intérieur de SQY PING
                </a>
              </Box>
              <Box component="li">
                Les données personnelles de l&apos;adhérent sont transmises à la
                Fédération Française de Tennis de Table lors de la prise de
                licence. SQY PING s&apos;engage à ne pas transmettre, vendre ou
                utiliser ces informations à d&apos;autres fins.
              </Box>
            </Box>
          </Typography>
        }
      />
    </Stack>
  );
}
