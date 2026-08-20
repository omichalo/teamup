"use client";

import { useId, useRef, useState } from "react";
import { Button, Chip, Popover, Stack, Typography } from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS } from "@/lib/club-registration/medical-certificate";
import type { ManagedListMedicalCertificateFilter } from "@/lib/club-registration/medical-certificate";
import { MANAGED_LIST_PPS_FOLLOW_UP_FILTER_OPTIONS } from "@/lib/club-registration/pps-follow-up";
import type { ManagedListPpsFollowUpFilter } from "@/lib/club-registration/pps-follow-up";
import { MANAGED_LIST_CRITERIUM_FEDERAL_FILTER_OPTIONS } from "@/lib/club-registration/criterium-federal-follow-up";
import type { ManagedListCriteriumFederalFilter } from "@/lib/club-registration/criterium-federal-follow-up";
import { MANAGED_LIST_JERSEY_FOLLOW_UP_FILTER_OPTIONS } from "@/lib/club-registration/jersey-follow-up";
import type { ManagedListJerseyFollowUpFilter } from "@/lib/club-registration/jersey-follow-up";
import { MANAGED_LIST_REGISTRATION_CERTIFICATE_FOLLOW_UP_FILTER_OPTIONS } from "@/lib/club-registration/registration-certificate-follow-up";
import type { ManagedListRegistrationCertificateFollowUpFilter } from "@/lib/club-registration/registration-certificate-follow-up";
import { ManagedListFollowUpFilterGroup } from "./ManagedListFollowUpFilterGroup";
import {
  summarizeActiveFollowUpFilters,
  type ActiveFollowUpFilterId,
} from "./summarize-active-follow-up-filters";

type Props = {
  medicalCertificateFilter: ManagedListMedicalCertificateFilter;
  onMedicalCertificateFilterChange: (value: ManagedListMedicalCertificateFilter) => void;
  ppsFollowUpFilter: ManagedListPpsFollowUpFilter;
  onPpsFollowUpFilterChange: (value: ManagedListPpsFollowUpFilter) => void;
  criteriumFederalFilter: ManagedListCriteriumFederalFilter;
  onCriteriumFederalFilterChange: (value: ManagedListCriteriumFederalFilter) => void;
  jerseyFollowUpFilter: ManagedListJerseyFollowUpFilter;
  onJerseyFollowUpFilterChange: (value: ManagedListJerseyFollowUpFilter) => void;
  registrationCertificateFollowUpFilter: ManagedListRegistrationCertificateFollowUpFilter;
  onRegistrationCertificateFollowUpFilterChange: (
    value: ManagedListRegistrationCertificateFollowUpFilter
  ) => void;
};

export function ManagedListFollowUpFilters({
  medicalCertificateFilter,
  onMedicalCertificateFilterChange,
  ppsFollowUpFilter,
  onPpsFollowUpFilterChange,
  criteriumFederalFilter,
  onCriteriumFederalFilterChange,
  jerseyFollowUpFilter,
  onJerseyFollowUpFilterChange,
  registrationCertificateFollowUpFilter,
  onRegistrationCertificateFollowUpFilterChange,
}: Props) {
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const activeChips = summarizeActiveFollowUpFilters({
    medicalCertificateFilter,
    ppsFollowUpFilter,
    criteriumFederalFilter,
    jerseyFollowUpFilter,
    registrationCertificateFollowUpFilter,
  });
  const activeCount = activeChips.length;

  const clearFilter = (id: ActiveFollowUpFilterId) => {
    if (id === "certificate") onMedicalCertificateFilterChange("all");
    if (id === "pps") onPpsFollowUpFilterChange("all");
    if (id === "criterium") onCriteriumFederalFilterChange("all");
    if (id === "jersey") onJerseyFollowUpFilterChange("all");
    if (id === "attestation") onRegistrationCertificateFollowUpFilterChange("all");
  };

  const clearAll = () => {
    onMedicalCertificateFilterChange("all");
    onPpsFollowUpFilterChange("all");
    onCriteriumFederalFilterChange("all");
    onJerseyFollowUpFilterChange("all");
    onRegistrationCertificateFollowUpFilterChange("all");
  };

  return (
    <>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          ref={triggerRef}
          size="small"
          variant={activeCount > 0 ? "contained" : "outlined"}
          color="primary"
          startIcon={<FilterAltIcon fontSize="small" />}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          onMouseDown={(event) => {
            if (open) {
              event.preventDefault();
              event.stopPropagation();
              setAnchorEl(null);
            }
          }}
          onClick={(event) => {
            if (!open) {
              setAnchorEl(event.currentTarget);
            }
          }}
          sx={{ px: 1.25, py: 0.35, fontSize: "0.75rem", lineHeight: 1.4, flexShrink: 0 }}
        >
          {activeCount > 0 ? `Suivis · ${activeCount}` : "Suivis"}
        </Button>
        {activeChips.map((chip) => (
          <Chip
            key={chip.id}
            size="small"
            label={chip.label}
            onClick={() => {
              if (triggerRef.current) {
                setAnchorEl(triggerRef.current);
              }
            }}
            onDelete={() => clearFilter(chip.id)}
            sx={{ fontSize: "0.72rem" }}
          />
        ))}
      </Stack>

      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-label": "Filtres de suivi",
            sx: { p: 1.75, width: 352, maxWidth: "calc(100vw - 32px)" },
          },
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Suivis secrétariat</Typography>
          <ManagedListFollowUpFilterGroup
            label="Certificat"
            value={medicalCertificateFilter}
            options={MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS}
            onChange={onMedicalCertificateFilterChange}
          />
          <ManagedListFollowUpFilterGroup
            label="PPS"
            value={ppsFollowUpFilter}
            options={MANAGED_LIST_PPS_FOLLOW_UP_FILTER_OPTIONS}
            onChange={onPpsFollowUpFilterChange}
          />
          <ManagedListFollowUpFilterGroup
            label="Critérium"
            value={criteriumFederalFilter}
            options={MANAGED_LIST_CRITERIUM_FEDERAL_FILTER_OPTIONS}
            onChange={onCriteriumFederalFilterChange}
          />
          <ManagedListFollowUpFilterGroup
            label="Maillot"
            value={jerseyFollowUpFilter}
            options={MANAGED_LIST_JERSEY_FOLLOW_UP_FILTER_OPTIONS}
            onChange={onJerseyFollowUpFilterChange}
          />
          <ManagedListFollowUpFilterGroup
            label="Attestation"
            value={registrationCertificateFollowUpFilter}
            options={MANAGED_LIST_REGISTRATION_CERTIFICATE_FOLLOW_UP_FILTER_OPTIONS}
            onChange={onRegistrationCertificateFollowUpFilterChange}
          />
          {activeCount > 0 ? (
            <Button size="small" onClick={clearAll} sx={{ alignSelf: "flex-start" }}>
              Effacer les suivis
            </Button>
          ) : null}
        </Stack>
      </Popover>
    </>
  );
}
