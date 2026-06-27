"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { getEnabledSections } from "@/lib/club-registration-config/helpers";
import type { Representative } from "@/lib/club-registration/schema";
import { RegistrationMultiSelectField } from "../RegistrationMultiSelectField";
import { SchoolPickupAdminFields } from "../SchoolPickupAdminFields";
import {
  RegistrationFfttFields,
  RegistrationSubmissionContext,
} from "./RegistrationSupplementarySections";
import { DetailSectionTitle } from "./DetailSectionTitle";
import {
  ADHERENT_ROLE_OPTIONS,
  buildSlotOptions,
  registrationStatusChipProps,
  REPRESENTATIVE_ROLE_OPTIONS,
  SEX_OPTIONS,
} from "./membership-request-detail-shared";
import type { MembershipRequestDetailState } from "./useMembershipRequestDetail";
import type { EditableRegistration } from "./types";

type Props = {
  detail: MembershipRequestDetailState;
  hideTitleHeader?: boolean;
};

export function MembershipRequestDetailFormPrimary({ detail, hideTitleHeader = false }: Props) {
  const {
    config,
    selected,
    form,
    statusSummary,
    updateField,
    patchFfttFields,
    updateRepresentative,
    addRepresentative,
    removeRepresentative,
  } = detail;

  if (!selected || !form) return null;

  const sectionOptions = getEnabledSections(config);
  const allSlotOptions = buildSlotOptions(config);
  const headerStatusChip = registrationStatusChipProps(
    statusSummary?.status ?? selected.status
  );

  return (
    <Stack spacing={3}>
      {!hideTitleHeader ? (
        <>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {form.firstName} {form.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Référence : {selected.id}
              </Typography>
            </Box>
            <Chip label={headerStatusChip.label} color={headerStatusChip.color} />
          </Stack>

          <Divider />
        </>
      ) : null}

      {hideTitleHeader ? (
        <Typography variant="body2" color="text.secondary">
          Référence : {selected.id}
        </Typography>
      ) : null}

      <RegistrationSubmissionContext
        submitterAccountEmail={selected.submitterAccountEmail}
        submittedAt={selected.submittedAt}
        updatedAt={selected.updatedAt}
      />

      <DetailSectionTitle>Identité et type d&apos;inscription</DetailSectionTitle>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Inscription pour"
            value={form.adherentRole}
            onChange={(e) =>
              updateField("adherentRole", e.target.value as EditableRegistration["adherentRole"])
            }
            fullWidth
          >
            {ADHERENT_ROLE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Date de naissance"
            type="date"
            value={form.birthDate}
            onChange={(e) => updateField("birthDate", e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={form.wasSqyMemberLastYear ?? false}
                onChange={(e) => updateField("wasSqyMemberLastYear", e.target.checked)}
              />
            }
            label="Adhérent SQY PING l’an dernier"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Prénom"
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Nom"
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Sexe"
            value={form.sex}
            onChange={(e) => updateField("sex", e.target.value as EditableRegistration["sex"])}
            fullWidth
          >
            {SEX_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Ville de naissance"
            value={form.birthCity}
            onChange={(e) => updateField("birthCity", e.target.value)}
            fullWidth
          />
        </Grid>
        {form.sex === "female" ? (
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.firstFemaleRegistrationSqy ?? false}
                  onChange={(e) => updateField("firstFemaleRegistrationSqy", e.target.checked)}
                />
              }
              label="Première inscription féminine au club SQY Ping"
            />
          </Grid>
        ) : null}
      </Grid>

      <RegistrationFfttFields
        ffttLicense={form.ffttLicense}
        ffttLicenseLookup={form.ffttLicenseLookup}
        onPatch={patchFfttFields}
      />

      <DetailSectionTitle>Contact et adresse</DetailSectionTitle>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="E-mail adhérent"
            value={form.adherentEmail}
            onChange={(e) => updateField("adherentEmail", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Téléphone principal"
            value={form.adherentPhonePrimary}
            onChange={(e) => updateField("adherentPhonePrimary", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Téléphone secondaire"
            value={form.adherentPhoneSecondary}
            onChange={(e) => updateField("adherentPhoneSecondary", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Adresse"
            value={form.addressLine1}
            onChange={(e) => updateField("addressLine1", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Complément d'adresse"
            value={form.addressLine2}
            onChange={(e) => updateField("addressLine2", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Code postal"
            value={form.postalCode}
            onChange={(e) => updateField("postalCode", e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField
            label="Ville"
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
            fullWidth
          />
        </Grid>
      </Grid>

      <DetailSectionTitle>Représentants légaux</DetailSectionTitle>
      <Stack spacing={2}>
        {form.representatives.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun représentant légal renseigné.
          </Typography>
        ) : (
          form.representatives.map((rep, index) => (
            <Card key={index} variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      label="Lien"
                      value={rep.role}
                      onChange={(e) =>
                        updateRepresentative(index, {
                          role: e.target.value as Representative["role"],
                        })
                      }
                      fullWidth
                    >
                      {REPRESENTATIVE_ROLE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Prénom"
                      value={rep.firstName}
                      onChange={(e) => updateRepresentative(index, { firstName: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Nom"
                      value={rep.lastName}
                      onChange={(e) => updateRepresentative(index, { lastName: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="E-mail"
                      value={rep.email}
                      onChange={(e) => updateRepresentative(index, { email: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Téléphone"
                      value={rep.phone}
                      onChange={(e) => updateRepresentative(index, { phone: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", alignItems: "center" }}>
                    <Button
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => removeRepresentative(index)}
                    >
                      Retirer ce représentant
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))
        )}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addRepresentative}
          disabled={form.representatives.length >= 2}
          sx={{ alignSelf: "flex-start" }}
        >
          Ajouter un représentant
        </Button>
      </Stack>

      <DetailSectionTitle>Sections, créneaux et pratique</DetailSectionTitle>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Section principale"
            value={form.mainSectionId}
            onChange={(e) => updateField("mainSectionId", e.target.value)}
            fullWidth
          >
            {sectionOptions.map((section) => (
              <MenuItem key={section.id} value={section.id}>
                {section.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RegistrationMultiSelectField
            label="Sections additionnelles"
            value={form.additionalSectionIds}
            options={sectionOptions.map((section) => ({
              value: section.id,
              label: section.label,
            }))}
            onChange={(value) => updateField("additionalSectionIds", value)}
          />
        </Grid>
        <SchoolPickupAdminFields
          slotIds={form.slotIds}
          schoolPickupSlotIds={form.schoolPickupSlotIds}
          allSlotOptions={allSlotOptions}
          onSlotIdsChange={(value) => updateField("slotIds", value)}
          onSchoolPickupSlotIdsChange={(value) => updateField("schoolPickupSlotIds", value)}
          MultiSelectField={RegistrationMultiSelectField}
        />
      </Grid>
    </Stack>
  );
}
