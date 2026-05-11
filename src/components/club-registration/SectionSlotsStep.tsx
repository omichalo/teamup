"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  CLUB_REGISTRATION_SITES,
  SECTION_PRINCIPALE_OPTIONS,
} from "@/lib/club-registration/constants";
import type { RegistrationDraft } from "./registration-defaults";

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

export function SectionSlotsStep({ draft, onChange }: Props) {
  const [expandedSiteIds, setExpandedSiteIds] = useState<Set<string>>(() =>
    siteIdsMatchingMainSection(draft.mainSectionId)
  );

  /** À chaque changement de section principale : un seul bloc de créneaux ouvert (celui qui correspond à l’id). */
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

  const toggleAdditionalSection = (id: (typeof SECTION_PRINCIPALE_OPTIONS)[number]["id"]) => {
    if (id === draft.mainSectionId) return;
    const set = new Set(draft.additionalSectionIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ additionalSectionIds: Array.from(set) });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Choisissez votre section principale, d&apos;éventuelles sections complémentaires, puis les
        créneaux auxquels vous souhaitez participer.
      </Typography>

      <FormControl fullWidth required>
        <InputLabel id="main-section-label">Section principale</InputLabel>
        <Select
          labelId="main-section-label"
          label="Section principale"
          value={draft.mainSectionId}
          onChange={(e) => {
            const next = e.target.value as RegistrationDraft["mainSectionId"];
            const cleaned = draft.additionalSectionIds.filter((x) => x !== next);
            onChange({ mainSectionId: next, additionalSectionIds: cleaned });
          }}
        >
          {SECTION_PRINCIPALE_OPTIONS.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack spacing={0.5}>
        <Typography variant="subtitle2">Autres sections</Typography>
        <FormGroup>
          {SECTION_PRINCIPALE_OPTIONS.filter((s) => s.id !== draft.mainSectionId).map((s) => (
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
          ))}
        </FormGroup>
      </Stack>

      <Typography variant="subtitle2">Créneaux souhaités</Typography>
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
    </Stack>
  );
}
