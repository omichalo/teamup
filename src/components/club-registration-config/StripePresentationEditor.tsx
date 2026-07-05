"use client";

import { Stack, TextField, Typography } from "@mui/material";
import { ReceiptLongOutlined } from "@mui/icons-material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { renderInvoiceHeader } from "@/lib/club-registration-config/helpers";
import { TemplateVariableField } from "./TemplateVariableField";
import { EuroAmountField } from "./EuroAmountField";
import {
  ConfigEditorCard,
  ConfigEditorHint,
  ConfigEditorInfoAlert,
  ConfigEditorOptionPanel,
  ConfigEditorRoot,
} from "./ConfigEditorLayout";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

const STRIPE_MAX = 500;

export function StripePresentationEditor({ config, onChange }: Props) {
  const stripe = config.stripePresentation;

  const update = (patch: Partial<typeof stripe>) => {
    onChange({
      ...config,
      stripePresentation: { ...stripe, ...patch },
    });
  };

  const updateJersey = (patch: Partial<RegistrationConfigV1["jersey"]>) => {
    onChange({
      ...config,
      jersey: { ...config.jersey, ...patch },
    });
  };

  const updateUiCopy = (patch: Partial<RegistrationConfigV1["uiCopy"]>) => {
    onChange({
      ...config,
      uiCopy: { ...config.uiCopy, ...patch },
    });
  };

  const previewInvoice = renderInvoiceHeader(stripe.invoiceHeaderTemplate, {
    clubName: config.meta.clubName,
    registrationId: "ABC123",
    adherentName: "Jean Dupont",
  });

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Stripe n&apos;accepte pas de lignes négatives : les remises restent agrégées dans la ligne
        adhésion. Limite {STRIPE_MAX} caractères pour les descriptions.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Ces libellés apparaissent sur le devis Stripe et la facture. L&apos;en-tête facture accepte
        des variables dynamiques.
      </ConfigEditorHint>

      <ConfigEditorCard>
        <Typography variant="subtitle2" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReceiptLongOutlined fontSize="small" color="primary" />
          Libellés des lignes Stripe
        </Typography>
        <Stack spacing={1.5}>
          <TextField
            label="Libellé adhésion"
            size="small"
            value={stripe.membershipLabel}
            onChange={(e) => update({ membershipLabel: e.target.value })}
            fullWidth
          />
          <TextField
            label="Libellé adhésion avec remises"
            size="small"
            value={stripe.membershipLabelWithDiscounts}
            onChange={(e) => update({ membershipLabelWithDiscounts: e.target.value })}
            helperText="Utilisé quand des remises sont appliquées"
            fullWidth
          />
          <TextField
            label="Libellé licence"
            size="small"
            value={stripe.licenseLabel}
            onChange={(e) => update({ licenseLabel: e.target.value })}
            fullWidth
          />
        </Stack>
      </ConfigEditorCard>

      <ConfigEditorCard>
        <Typography variant="subtitle2" fontWeight={600}>
          Maillot de compétition
        </Typography>
        <Stack spacing={1.5}>
          <EuroAmountField
            label="Prix maillot hors section compétiteur"
            valueCents={config.jersey.optionalPriceCents}
            onChangeCents={(optionalPriceCents) => updateJersey({ optionalPriceCents })}
            fullWidth
          />
          <TextField
            label="Libellé Stripe — maillot optionnel"
            size="small"
            value={config.jersey.optionalStripeLabel}
            onChange={(e) => updateJersey({ optionalStripeLabel: e.target.value })}
            fullWidth
          />
          <TextField
            label="Info maillot inclus (section compétiteur)"
            size="small"
            value={stripe.competitorJerseyInfoLabel}
            onChange={(e) => update({ competitorJerseyInfoLabel: e.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Texte d'aide — section compétiteur (formulaire)"
            size="small"
            value={config.uiCopy.competitorJerseyHelper}
            onChange={(e) => updateUiCopy({ competitorJerseyHelper: e.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Note sous le sélecteur de taille (formulaire)"
            size="small"
            value={config.uiCopy.jerseySizeHelper}
            onChange={(e) => updateUiCopy({ jerseySizeHelper: e.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Libellé case à cocher — maillot optionnel"
            size="small"
            value={config.uiCopy.optionalJerseyOptInLabel}
            onChange={(e) => updateUiCopy({ optionalJerseyOptInLabel: e.target.value })}
            fullWidth
          />
          <TextField
            label="Engagement de disponibilité — compétitions (formulaire)"
            size="small"
            value={config.uiCopy.competitionAvailabilityCommitmentNotice ?? ""}
            onChange={(e) =>
              updateUiCopy({ competitionAvailabilityCommitmentNotice: e.target.value })
            }
            multiline
            minRows={4}
            fullWidth
            helperText="Affiché lors d'une inscription à une compétition avec engagement de disponibilité."
          />
        </Stack>
      </ConfigEditorCard>

      <ConfigEditorCard>
        <Typography variant="subtitle2" fontWeight={600}>
          En-tête facture
        </Typography>
        <ConfigEditorOptionPanel>
          <TemplateVariableField
            label="Modèle d'en-tête"
            value={stripe.invoiceHeaderTemplate}
            onChange={(invoiceHeaderTemplate) => update({ invoiceHeaderTemplate })}
            preview={previewInvoice}
            previewLength={previewInvoice.length}
          />
        </ConfigEditorOptionPanel>
        <TextField
          label="Champ custom remises"
          size="small"
          value={stripe.discountCustomFieldName}
          onChange={(e) => update({ discountCustomFieldName: e.target.value })}
          helperText="Nom du champ Stripe pour le détail des remises"
          fullWidth
        />
      </ConfigEditorCard>
    </ConfigEditorRoot>
  );
}
