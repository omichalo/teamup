"use client";

import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CAMP_PAYMENT_METHOD_IDS,
  CAMP_PAYMENT_METHOD_LABELS,
  type CampPaymentMethodId,
} from "@/lib/camps/constants";
import {
  clubRegistrationOptionLabel,
  type CampSubjectMode,
} from "@/lib/camps/camp-registration-form-helpers";
import { campFormulaSelectionKey } from "@/lib/camps/formulas";
import { CampMemberSearchField } from "./CampMemberSearchField";
import { CampRegistrationIdentitySection } from "./CampRegistrationIdentitySection";
import { CampSlotSelection } from "./CampSlotSelection";
import { useCampRegistrationForm } from "./useCampRegistrationForm";

type Props = {
  campId: string;
  mode: "self" | "staff";
};

export function CampRegistrationForm({ campId, mode }: Props) {
  const form = useCampRegistrationForm(campId, mode);
  const showHousehold =
    mode === "self" && form.clubRegistrations.length > 0;

  if (form.loading) {
    return <Typography sx={{ p: 3 }}>Chargement…</Typography>;
  }
  if (!form.camp) {
    return <Alert severity="error">{form.error ?? "Stage introuvable"}</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: 2, py: 3 }}>
      <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 1 }}>
        Inscription — {form.camp.title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {mode === "staff"
          ? "Saisie secrétariat : recherchez un adhérent ou inscrivez un non-licencié."
          : "Choisissez qui inscrit, puis le site. Les adhérents ont la semaine pré-cochée."}
      </Typography>

      {form.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {form.error}
        </Alert>
      ) : null}

      <Stack spacing={2}>
        <FormControl>
          <FormLabel>Personne à inscrire</FormLabel>
          <RadioGroup
            value={form.subjectMode}
            onChange={(e) =>
              form.setSubjectMode(e.target.value as CampSubjectMode)
            }
          >
            {showHousehold ? (
              <FormControlLabel
                value="household"
                control={<Radio />}
                label="Un de mes dossiers d’adhésion"
              />
            ) : null}
            <FormControlLabel
              value="search"
              control={<Radio />}
              label="Autre adhérent du club (recherche)"
            />
            <FormControlLabel
              value="guest"
              control={<Radio />}
              label="Non licencié / non adhérent"
            />
          </RadioGroup>
        </FormControl>

        {form.subjectMode === "household" && form.clubRegistrations.length > 1 ? (
          <TextField
            select
            label="Adhérent concerné"
            value={form.clubRegistrationId ?? ""}
            onChange={(e) => form.onClubRegistrationChange(e.target.value)}
            fullWidth
            helperText="Plusieurs dossiers sur ce compte — choisissez la personne inscrite."
          >
            {form.clubRegistrations.map((reg) => (
              <MenuItem key={reg.id} value={reg.id}>
                {clubRegistrationOptionLabel(reg)}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        {form.subjectMode === "search" ? (
          <CampMemberSearchField onPick={form.onSearchPick} />
        ) : null}

        {mode === "staff" && form.subjectMode === "guest" ? (
          <TextField
            label="UID du compte propriétaire"
            value={form.ownerUid}
            onChange={(e) => form.setOwnerUid(e.target.value)}
            required
            fullWidth
            helperText="Compte TeamUp qui portera l’inscription (Mes stages)"
          />
        ) : null}

        <CampRegistrationIdentitySection
          subjectMode={form.subjectMode}
          pickedLabel={form.pickedLabel}
          firstName={form.firstName}
          lastName={form.lastName}
          birthDate={form.birthDate}
          phone={form.phone}
          email={form.email}
          onChange={(field, value) => {
            if (field === "firstName") form.setFirstName(value);
            if (field === "lastName") form.setLastName(value);
            if (field === "birthDate") form.setBirthDate(value);
            if (field === "phone") form.setPhone(value);
            if (field === "email") form.setEmail(value);
          }}
        />

        <TextField
          select
          label="Site"
          value={form.siteId}
          onChange={(e) => form.onSiteChange(e.target.value)}
          fullWidth
        >
          {form.sites.map((site) => (
            <MenuItem key={site.id} value={site.id}>
              {site.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Formule"
          value={form.formulaSelection}
          onChange={(e) => form.onFormulaChange(e.target.value)}
          fullWidth
          disabled={form.siteFormulas.length === 0}
        >
          {form.siteFormulas.map((f) => {
            const key = campFormulaSelectionKey(f.siteId, f.id);
            return (
              <MenuItem key={key} value={key}>
                {f.label}
              </MenuItem>
            );
          })}
        </TextField>

        <CampSlotSelection
          pricingMode={form.pricingMode}
          slots={form.formulaSlots}
          selectedSlotIds={form.selectedSlotIds}
          weekPrefillHint={form.isClubMember}
          onChange={form.setSelectedSlotIds}
        />

        <TextField
          select
          label="Mode de paiement"
          value={form.chosenMethod}
          onChange={(e) =>
            form.setChosenMethod(e.target.value as CampPaymentMethodId)
          }
          fullWidth
        >
          {CAMP_PAYMENT_METHOD_IDS.map((m) => (
            <MenuItem key={m} value={m}>
              {CAMP_PAYMENT_METHOD_LABELS[m]}
            </MenuItem>
          ))}
        </TextField>

        {form.quote ? (
          <Alert severity="info">
            Total estimé : {(form.quote.totalCents / 100).toFixed(2)} € (
            {form.quote.lines
              .map((l) => `${l.quantity}× ${l.label}`)
              .join(", ")}
            )
          </Alert>
        ) : null}

        <Button
          variant="contained"
          size="large"
          disabled={
            form.submitting ||
            !form.identityReady ||
            !form.staffOwnerReady ||
            !form.parsedSelection ||
            form.selectedSlotIds.length === 0
          }
          onClick={() => void form.handleSubmit()}
        >
          {form.submitting ? "Envoi…" : "Soumettre l’inscription"}
        </Button>
      </Stack>
    </Box>
  );
}
