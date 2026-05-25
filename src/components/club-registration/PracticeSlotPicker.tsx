"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  getEnabledSites,
  sanitizeSchoolPickupSlotIdsFromConfig,
} from "@/lib/club-registration-config/helpers";
import { registrationSiteGymnasiumLabel } from "@/lib/club-registration-config/site-display";
import { useRegistrationConfigValue } from "@/hooks/useRegistrationConfig";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  expandedSiteIds: Set<string>;
  onExpandedSiteIdsChange: (next: Set<string>) => void;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

export function PracticeSlotPicker({
  draft,
  expandedSiteIds,
  onExpandedSiteIdsChange,
  onChange,
}: Props) {
  const config = useRegistrationConfigValue();
  const sites = getEnabledSites(config);
  const schoolPickupCopy = config.uiCopy.schoolPickupService;

  const toggleSlot = (id: string) => {
    const slotSet = new Set(draft.slotIds);
    const pickupSet = new Set(draft.schoolPickupSlotIds);
    if (slotSet.has(id)) {
      slotSet.delete(id);
      pickupSet.delete(id);
    } else {
      slotSet.add(id);
    }
    onChange({
      slotIds: Array.from(slotSet),
      schoolPickupSlotIds: Array.from(pickupSet),
    });
  };

  const toggleSchoolPickup = (slotId: string) => {
    const pickupSet = new Set(draft.schoolPickupSlotIds);
    if (pickupSet.has(slotId)) {
      pickupSet.delete(slotId);
    } else {
      pickupSet.add(slotId);
    }
    onChange({
      schoolPickupSlotIds: sanitizeSchoolPickupSlotIdsFromConfig(
        config,
        draft.slotIds,
        Array.from(pickupSet)
      ),
    });
  };

  return (
    <>
      <Typography variant="subtitle2" data-field="slotIds" tabIndex={-1}>
        Créneaux souhaités
      </Typography>
      {sites.map((site) => {
        const gymnasiumLabel = registrationSiteGymnasiumLabel(site);
        return (
        <Accordion
          key={site.id}
          disableGutters
          expanded={expandedSiteIds.has(site.id)}
          onChange={(_, expanded) => {
            onExpandedSiteIdsChange(
              (() => {
                const next = new Set(expandedSiteIds);
                if (expanded) next.add(site.id);
                else next.delete(site.id);
                return next;
              })()
            );
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack spacing={0.25}>
              <Typography fontWeight={600}>{site.label}</Typography>
              {gymnasiumLabel ? (
                <Typography variant="body2" color="text.secondary">
                  {gymnasiumLabel}
                </Typography>
              ) : null}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {site.slots
                .filter((slot) => slot.enabled)
                .map((slot) => {
                const isSelected = draft.slotIds.includes(slot.id);
                const wantsSchoolPickup = draft.schoolPickupSlotIds.includes(slot.id);

                return (
                  <Box key={slot.id} sx={{ mb: slot.schoolPickupSchool ? 1.5 : 0 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSlot(slot.id)}
                        />
                      }
                      label={slot.label}
                    />
                    {isSelected && slot.schoolPickupSchool ? (
                      <Box sx={{ pl: 4, mt: 0.5 }}>
                        <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {schoolPickupCopy.title}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {schoolPickupCopy.intro}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            École concernée : <strong>{slot.schoolPickupSchool}</strong>
                          </Typography>
                          <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2.5 }}>
                            {schoolPickupCopy.steps.map((step) => (
                              <Typography
                                key={step}
                                component="li"
                                variant="body2"
                                color="text.secondary"
                              >
                                {step}
                              </Typography>
                            ))}
                          </Stack>
                        </Alert>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={wantsSchoolPickup}
                              onChange={() => toggleSchoolPickup(slot.id)}
                            />
                          }
                          label={schoolPickupCopy.optInLabel}
                        />
                      </Box>
                    ) : null}
                  </Box>
                );
              })}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      );
      })}
    </>
  );
}
