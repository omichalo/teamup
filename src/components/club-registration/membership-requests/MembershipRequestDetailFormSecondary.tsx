"use client";

import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { isMedicalCertificateRequired, type MedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import { APPLICANT_NOTES_MAX_LENGTH } from "@/lib/club-registration/applicant-notes";
import { formatCentsAsEuros } from "@/lib/pricing";
import { PricingBreakdown } from "../PricingBreakdown";
import { RegistrationCompetitionFields } from "../RegistrationCompetitionFields";
import { ReductionReferenceCodeAdminFields } from "../ReductionReferenceCodeAdminFields";
import { RegistrationMultiSelectField } from "../RegistrationMultiSelectField";
import type { RegistrationDraft } from "../registration-defaults";
import { PaymentTrackingSection } from "../secretariat/PaymentTrackingSection";
import { SecretariatPaymentNotesSection } from "../secretariat/SecretariatPaymentNotesSection";
import { RegistrationMedicalDossierDetail } from "./RegistrationSupplementarySections";
import { DetailSectionTitle } from "./DetailSectionTitle";
import {
  BOOLEAN_CONSENT_OPTIONS,
  FAMILY_ORDER_OPTIONS,
  formatRegistrationDate,
  MEDICAL_CERTIFICATE_STATUS_OPTIONS,
  MEDICAL_OPTIONS,
} from "./membership-request-detail-shared";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { DeleteRegistrationSection } from "./DeleteRegistrationSection";
import type { MembershipRequestDetailState } from "./useMembershipRequestDetail";
import type { EditableRegistration, MembershipListReloadFn } from "./types";

type Props = {
  detail: MembershipRequestDetailState;
  onListReload?: MembershipListReloadFn | undefined;
  onDeleted?: (() => void | Promise<void>) | undefined;
};

export function MembershipRequestDetailFormSecondary({
  detail,
  onListReload,
  onDeleted,
}: Props) {
  const {
    config,
    registrationId,
    selected,
    form,
    selectedPayment,
    saving,
    requestingPayment,
    persistingQuote,
    liveQuote,
    enteredAmountCents,
    expectedPayableAfterAidsCents,
    amountDiffersFromQuote,
    fetchDetail,
    updateField,
    updateMedicalDeclaration,
    applyCalculatedAmount,
    persistQuote,
    save,
    requestPayment,
  } = detail;

  if (!selected || !form) return null;

  const competitionOptions = config.competitions.filter((c) => c.enabled);
  const reductionOptions = config.aidRules;
  const jerseySizes = config.uiCopy.jerseySizes;

  return (
    <Stack spacing={3}>
      <DetailSectionTitle>Dossier administratif</DetailSectionTitle>
      <Grid container spacing={2}>
        <RegistrationMedicalDossierDetail
          registration={{
            birthDate: form.birthDate,
            medicalQuestionnaire: selected.medicalQuestionnaire,
            medicalVeteranPath: selected.medicalVeteranPath,
            ffttLicenseLookup: form.ffttLicenseLookup,
          }}
        />
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Déclaration médicale"
            value={form.medicalCertificateDeclaration}
            onChange={(e) => updateMedicalDeclaration(e.target.value)}
            fullWidth
          >
            {MEDICAL_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Suivi certificat médical"
            value={form.medicalCertificateStatus}
            onChange={(e) =>
              updateField(
                "medicalCertificateStatus",
                e.target.value as MedicalCertificateStatus
              )
            }
            disabled={!isMedicalCertificateRequired(form.medicalCertificateDeclaration)}
            fullWidth
            helperText={
              isMedicalCertificateRequired(form.medicalCertificateDeclaration)
                ? "Suivi interne du certificat, sans stockage du document."
                : "Aucun certificat médical requis pour cette déclaration."
            }
          >
            {MEDICAL_CERTIFICATE_STATUS_OPTIONS.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                disabled={
                  isMedicalCertificateRequired(form.medicalCertificateDeclaration) &&
                  option.value === "not_required"
                }
              >
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Ordre inscription famille"
            value={form.familyRegistrationOrder}
            onChange={(e) => updateField("familyRegistrationOrder", e.target.value)}
            fullWidth
          >
            {FAMILY_ORDER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RegistrationMultiSelectField
            label="Aides / réductions"
            value={form.reductionTypes}
            options={reductionOptions.map((reduction) => ({
              value: reduction.id,
              label: reduction.label,
            }))}
            onChange={(value) => updateField("reductionTypes", value)}
          />
        </Grid>
        <ReductionReferenceCodeAdminFields
          config={config}
          reductionTypes={form.reductionTypes}
          reductionReferenceCodes={form.reductionReferenceCodes}
          onReferenceCodesChange={(codes) => updateField("reductionReferenceCodes", codes)}
        />
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={form.wantsRegistrationCertificate}
                onChange={(e) => updateField("wantsRegistrationCertificate", e.target.checked)}
              />
            }
            label="Demande d'attestation d'inscription"
          />
        </Grid>
      </Grid>

      <DetailSectionTitle>Autorisations et engagements</DetailSectionTitle>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Droit à l'image"
            value={form.photoConsent}
            onChange={(e) =>
              updateField("photoConsent", e.target.value as EditableRegistration["photoConsent"])
            }
            fullWidth
          >
            <MenuItem value="accept">Accepte</MenuItem>
            <MenuItem value="refuse">Refuse</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Autorisation médicale d'urgence"
            value={form.emergencyMedicalAuthorization}
            onChange={(e) =>
              updateField(
                "emergencyMedicalAuthorization",
                e.target.value as EditableRegistration["emergencyMedicalAuthorization"]
              )
            }
            fullWidth
          >
            {BOOLEAN_CONSENT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Prise en charge à l'heure des cours"
            value={form.supervisionAcknowledgement}
            onChange={(e) =>
              updateField(
                "supervisionAcknowledgement",
                e.target.value as EditableRegistration["supervisionAcknowledgement"]
              )
            }
            fullWidth
          >
            {BOOLEAN_CONSENT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={form.internalRulesAccepted}
                onChange={(e) => updateField("internalRulesAccepted", e.target.checked)}
              />
            }
            label="Règlement intérieur accepté"
          />
        </Grid>
      </Grid>

      <DetailSectionTitle>Compétition</DetailSectionTitle>
      <RegistrationCompetitionFields
        config={config}
        form={form}
        jerseySizes={jerseySizes}
        competitionOptions={competitionOptions}
        onFieldChange={updateField}
      />

      <DetailSectionTitle>Tarification</DetailSectionTitle>
      <Stack spacing={2}>
        <PricingBreakdown
          draft={{
            birthDate: form.birthDate,
            mainSectionId: form.mainSectionId,
            wantsCompetitorExtras: form.wantsCompetitorExtras,
            wantsOptionalJersey: form.wantsOptionalJersey,
            competitionIds: form.competitionIds,
            familyRegistrationOrder:
              form.familyRegistrationOrder as RegistrationDraft["familyRegistrationOrder"],
            sex: form.sex,
            firstFemaleRegistrationSqy: form.firstFemaleRegistrationSqy,
            reductionTypes: form.reductionTypes,
            paymentAids: form.paymentAids,
          }}
          variant="full"
        />

        {liveQuote && liveQuote.totalCents > 0 ? (
          <Typography variant="body2" color="text.secondary">
            Total calculé : <strong>{formatCentsAsEuros(liveQuote.totalCents)}</strong>
            {selected.pricingQuoteComputedAt
              ? ` — dernier devis serveur : ${formatRegistrationDate(selected.pricingQuoteComputedAt)}`
              : null}
          </Typography>
        ) : null}

        {amountDiffersFromQuote ? (
          <Alert severity="warning">
            Le montant saisi ({formatCentsAsEuros(enteredAmountCents ?? 0)}) diffère du reste à
            payer estimé ({formatCentsAsEuros(expectedPayableAfterAidsCents ?? 0)}
            {liveQuote ? `, total devis ${formatCentsAsEuros(liveQuote.totalCents)}` : ""}
            ).
          </Alert>
        ) : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="outlined"
            onClick={applyCalculatedAmount}
            disabled={
              !liveQuote ||
              liveQuote.totalCents <= 0 ||
              saving ||
              requestingPayment ||
              persistingQuote
            }
          >
            Appliquer le montant calculé
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RefreshIcon />}
            onClick={() => void persistQuote()}
            disabled={saving || requestingPayment || persistingQuote}
          >
            {persistingQuote ? "Enregistrement..." : "Enregistrer le devis"}
          </Button>
        </Stack>
      </Stack>

      <DetailSectionTitle>Précisions de l&apos;inscrit</DetailSectionTitle>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Message transmis avec le dossier"
            value={form.applicantNotes}
            onChange={(e) => updateField("applicantNotes", e.target.value)}
            fullWidth
            multiline
            minRows={3}
            inputProps={{ maxLength: APPLICANT_NOTES_MAX_LENGTH }}
            helperText="Saisi par l'inscrit en fin de parcours (facultatif)."
          />
        </Grid>
      </Grid>

      {registrationId && selectedPayment ? (
        <PaymentTrackingSection
          registrationId={registrationId}
          payment={selectedPayment}
          onRefresh={async () => {
            const result = await onListReload?.({ advance: "if_removed" });
            if (!result?.advanced && registrationId) {
              await fetchDetail(registrationId);
            }
          }}
        />
      ) : null}

      <SecretariatPaymentNotesSection
        amountEuros={form.amountEuros}
        reviewNotes={form.reviewNotes}
        onAmountEurosChange={(value) => updateField("amountEuros", value)}
        onReviewNotesChange={(value) => updateField("reviewNotes", value)}
        paymentEmailSentTo={selected.paymentEmailSentTo ?? null}
        paymentMethod={selectedPayment?.paymentMethod}
        saving={saving}
        requestingPayment={requestingPayment}
        persistingQuote={persistingQuote}
        onSave={async () => {
          await save();
        }}
        onRequestPayment={requestPayment}
      />

      {registrationId ? (
        <DeleteRegistrationSection
          registrationId={registrationId}
          firstName={form.firstName}
          lastName={form.lastName}
          adherentDisplayName={formatPersonDisplayName(form.firstName, form.lastName)}
          status={selected.status ?? null}
          disabled={saving || requestingPayment || persistingQuote}
          onDeleted={async () => {
            await onListReload?.({ advance: "always" });
            await onDeleted?.();
          }}
        />
      ) : null}
    </Stack>
  );
}
