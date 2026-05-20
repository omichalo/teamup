"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  CLUB_REGISTRATION_SITES,
  COMPETITION_OPTIONS,
  HANDISPORT_PRACTICE_OPTIONS,
  JERSEY_SIZES,
  SECTION_PRINCIPALE_OPTIONS,
} from "@/lib/club-registration/constants";
import type { RegistrationDraft } from "./registration-defaults";

const ADAPTED_SECTIONS = new Set(["handisport", "sport-adapte"]);

type Props = {
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

function siteIdsMatchingMainSection(mainSectionId: string): Set<string> {
  const ids = new Set<string>();
  for (const site of CLUB_REGISTRATION_SITES) {
    if (site.id === mainSectionId) ids.add(site.id);
  }
  return ids;
}

/**
 * Étape 4 — « Pratique sportive ».
 *
 * Regroupe tout ce qui touche au choix de pratique sportive de l'adhérent :
 * - lieu principal (`mainSectionId`) et lieux complémentaires ;
 * - créneaux souhaités, organisés par accordéon par lieu ;
 * - extension compétiteur (anciennement à l'étape « consentements ») : taille
 *   de maillot et compétitions visées.
 *
 * Le terme « lieu principal » est préféré à « section principale » : pour la
 * plupart des entrées la valeur correspond à un site géographique (Voisins,
 * Villepreux, etc.). Les sections « handisport » et « sport-adapté » restent
 * proposées dans la même liste.
 */
export function PracticeStep({ draft, onChange }: Props) {
  const [expandedSiteIds, setExpandedSiteIds] = useState<Set<string>>(() =>
    siteIdsMatchingMainSection(draft.mainSectionId)
  );

  /** À chaque changement de lieu principal : un seul bloc de créneaux ouvert
   * (celui qui correspond à l’id). */
  useEffect(() => {
    setExpandedSiteIds(siteIdsMatchingMainSection(draft.mainSectionId));
  }, [draft.mainSectionId]);

  const toggleSlot = (id: string) => {
    const set = new Set(draft.slotIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ slotIds: Array.from(set) });
  };

  const toggleAdditionalSection = (
    id: (typeof SECTION_PRINCIPALE_OPTIONS)[number]["id"]
  ) => {
    if (id === draft.mainSectionId) return;
    const set = new Set(draft.additionalSectionIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ additionalSectionIds: Array.from(set) });
  };

  const toggleCompetition = (
    id: (typeof COMPETITION_OPTIONS)[number]["id"]
  ) => {
    const set = new Set(draft.competitionIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ competitionIds: Array.from(set) });
  };

  const isAdaptedMainSection = ADAPTED_SECTIONS.has(draft.mainSectionId);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Choisissez votre lieu principal d&apos;entraînement, d&apos;éventuels
        lieux complémentaires, puis les créneaux auxquels vous souhaitez
        participer.
      </Typography>

      <FormControl fullWidth required>
        <InputLabel id="main-section-label">
          Lieu principal d’entraînement
        </InputLabel>
        <Select
          labelId="main-section-label"
          label="Lieu principal d’entraînement"
          name="mainSectionId"
          value={draft.mainSectionId}
          onChange={(e) => {
            const next = e.target.value as RegistrationDraft["mainSectionId"];
            const cleaned = draft.additionalSectionIds.filter((x) => x !== next);
            const patch: Partial<RegistrationDraft> = {
              mainSectionId: next,
              additionalSectionIds: cleaned,
            };
            if (next !== "handisport") {
              patch.handisportPracticeLevel = "";
            }
            onChange(patch);
          }}
        >
          {SECTION_PRINCIPALE_OPTIONS.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {draft.mainSectionId === "handisport" ? (
        <FormControl
          component="fieldset"
          required
          data-field="handisportPracticeLevel"
        >
          <Typography
            variant="subtitle2"
            component="legend"
            id="handisport-practice-label"
            sx={{ mb: 0.5 }}
          >
            Type de pratique handisport
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            Ce choix détermine le tarif (loisirs ou compétition selon l’âge).
          </Typography>
          <RadioGroup
            aria-labelledby="handisport-practice-label"
            name="handisportPracticeLevel"
            value={draft.handisportPracticeLevel}
            onChange={(e) =>
              onChange({
                handisportPracticeLevel: e.target
                  .value as RegistrationDraft["handisportPracticeLevel"],
              })
            }
          >
            {HANDISPORT_PRACTICE_OPTIONS.map((option) => (
              <FormControlLabel
                key={option.id}
                value={option.id}
                control={<Radio />}
                label={option.label}
              />
            ))}
          </RadioGroup>
        </FormControl>
      ) : null}

      <Stack spacing={0.5}>
        <Typography
          variant="subtitle2"
          data-field="additionalSectionIds"
          tabIndex={-1}
        >
          Autres lieux fréquentés (optionnel)
        </Typography>
        <FormGroup>
          {SECTION_PRINCIPALE_OPTIONS.filter((s) => s.id !== draft.mainSectionId).map(
            (s) => (
              <FormControlLabel
                key={s.id}
                control={
                  <Checkbox
                    checked={draft.additionalSectionIds.includes(s.id)}
                    onChange={() => toggleAdditionalSection(s.id)}
                  />
                }
                label={s.label}
              />
            )
          )}
        </FormGroup>
      </Stack>

      <Typography variant="subtitle2" data-field="slotIds" tabIndex={-1}>
        Créneaux souhaités
      </Typography>
      {CLUB_REGISTRATION_SITES.map((site) => (
        <Accordion
          key={site.id}
          disableGutters
          expanded={expandedSiteIds.has(site.id)}
          onChange={(_, expanded) => {
            setExpandedSiteIds((prev) => {
              const next = new Set(prev);
              if (expanded) next.add(site.id);
              else next.delete(site.id);
              return next;
            });
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>{site.label}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {site.slots.map((slot) => (
                <FormControlLabel
                  key={slot.id}
                  control={
                    <Checkbox
                      checked={draft.slotIds.includes(slot.id)}
                      onChange={() => toggleSlot(slot.id)}
                    />
                  }
                  label={slot.label}
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      ))}

      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
      >
        Pratique compétiteur
      </Typography>

      {isAdaptedMainSection ? (
        <Alert severity="info">
          La section compétiteur classique (maillot, championnats fédéraux) ne
          s’applique pas aux sections handisport et sport adapté. L’option
          « Compétition handisport » reste disponible dans les compétitions
          envisagées, sans extension compétiteur.
        </Alert>
      ) : (
        <FormControlLabel
          data-field="wantsCompetitorExtras"
          control={
            <Switch
              checked={draft.wantsCompetitorExtras}
              onChange={(e) =>
                onChange({ wantsCompetitorExtras: e.target.checked })
              }
            />
          }
          label="Je souhaite m’inscrire en section compétiteur (maillot et compétitions)"
        />
      )}

      {!isAdaptedMainSection && draft.wantsCompetitorExtras && (
        <Stack spacing={2}>
          <FormControl fullWidth required={draft.wantsCompetitorExtras}>
            <InputLabel id="jersey-label">
              Taille de maillot de compétition
            </InputLabel>
            <Select
              labelId="jersey-label"
              label="Taille de maillot de compétition"
              name="competitionJerseySize"
              value={draft.competitionJerseySize ?? ""}
              onChange={(e) =>
                onChange({
                  competitionJerseySize: e.target
                    .value as RegistrationDraft["competitionJerseySize"],
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
        </Stack>
      )}
    </Stack>
  );
}
