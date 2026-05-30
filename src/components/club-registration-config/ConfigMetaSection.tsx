"use client";

import { TextField, Typography } from "@mui/material";
import { SettingsOutlined } from "@mui/icons-material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
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

export function ConfigMetaSection({ config, onChange }: Props) {
  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Paramètres généraux de la saison en cours. Le <strong>nom du club</strong> est utilisé dans
        les factures Stripe ; la <strong>version catalogue</strong> fige les tarifs sur chaque dossier
        d&apos;inscription.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Modifiez ces valeurs avec prudence : la version catalogue ne doit changer qu&apos;en cas de
        refonte tarifaire.
      </ConfigEditorHint>
      <ConfigEditorCard>
        <Typography variant="subtitle2" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SettingsOutlined fontSize="small" color="primary" />
          Identité & saison
        </Typography>
        <TextField
          label="Nom du club"
          value={config.meta.clubName}
          onChange={(e) =>
            onChange({
              ...config,
              meta: { ...config.meta, clubName: e.target.value },
            })
          }
          helperText="Affiché aux familles et dans les documents Stripe"
          fullWidth
        />
        <TextField
          label="Saison"
          value={config.meta.seasonLabel}
          onChange={(e) =>
            onChange({
              ...config,
              meta: { ...config.meta, seasonLabel: e.target.value },
            })
          }
          helperText="Ex. 2025-2026"
          fullWidth
        />
        <ConfigEditorOptionPanel title="Version technique">
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Identifiant stocké sur chaque dossier et session Stripe
          </Typography>
          <TextField
            label="Identifiant de version"
            size="small"
            value={config.meta.catalogVersion}
            onChange={(e) =>
              onChange({
                ...config,
                meta: { ...config.meta, catalogVersion: e.target.value },
              })
            }
            helperText="Stocké sur les dossiers et les sessions Stripe — incrémentez à chaque publication majeure"
            fullWidth
          />
        </ConfigEditorOptionPanel>
      </ConfigEditorCard>
    </ConfigEditorRoot>
  );
}
