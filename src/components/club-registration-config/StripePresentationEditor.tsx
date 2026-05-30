"use client";

import { Stack, TextField, Typography } from "@mui/material";
import { ReceiptLongOutlined } from "@mui/icons-material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { renderInvoiceHeader } from "@/lib/club-registration-config/helpers";
import { TemplateVariableField } from "./TemplateVariableField";
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
            label="Libellé licence FFTT"
            size="small"
            value={stripe.licenseLabel}
            onChange={(e) => update({ licenseLabel: e.target.value })}
            fullWidth
          />
          <TextField
            label="Info maillot compétiteur"
            size="small"
            value={stripe.competitorJerseyInfoLabel}
            onChange={(e) => update({ competitorJerseyInfoLabel: e.target.value })}
            multiline
            minRows={2}
            fullWidth
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
