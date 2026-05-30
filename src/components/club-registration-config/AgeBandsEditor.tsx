"use client";

import type { AgeBand, AgeBandProfile, RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { moveArrayItem } from "@/lib/club-registration-config/sort-order";
import {
  AgeBandProfileEditorCard,
} from "./AgeBandProfileEditorCard";
import {
  ConfigEditorHint,
  ConfigEditorInfoAlert,
  ConfigEditorRoot,
} from "./ConfigEditorLayout";
import { useConfigEditorExpansion } from "./useConfigEditorExpansion";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

export function AgeBandsEditor({ config, onChange }: Props) {
  const updateProfile = (profileId: string, patch: Partial<AgeBandProfile>) => {
    onChange({
      ...config,
      ageBandProfiles: {
        ...config.ageBandProfiles,
        [profileId]: { ...config.ageBandProfiles[profileId], ...patch },
      },
    });
  };

  const updateBand = (profileId: string, bandId: string, patch: Partial<AgeBand>) => {
    const profile = config.ageBandProfiles[profileId];
    updateProfile(profileId, {
      bands: profile.bands.map((band) => (band.id === bandId ? { ...band, ...patch } : band)),
    });
  };

  const moveBand = (profileId: string, fromIndex: number, toIndex: number) => {
    const profile = config.ageBandProfiles[profileId];
    updateProfile(profileId, {
      bands: moveArrayItem(profile.bands, fromIndex, toIndex),
    });
  };

  const profileEntries = Object.entries(config.ageBandProfiles);
  const expansion = useConfigEditorExpansion();

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Chaque <strong>profil de tranches d&apos;âge</strong> définit les catégories (ex. « moins de 15
        ans »). Le profil tarifaire (Handisport, etc.) se choisit sur l&apos;onglet{" "}
        <strong>Sections</strong>.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Trois profils prédéfinis (classique, handisport, sport adapté). Glissez-déposez les tranches
        à l&apos;intérieur de chaque profil si besoin.
      </ConfigEditorHint>
      {profileEntries.map(([profileId, profile]) => (
        <AgeBandProfileEditorCard
          key={profileId}
          config={config}
          profileId={profileId}
          profile={profile}
          expanded={expansion.isExpanded(profileId)}
          onExpandedChange={(open) => expansion.setExpanded(profileId, open)}
          onUpdateProfile={(patch) => updateProfile(profileId, patch)}
          onUpdateBand={(bandId, patch) => updateBand(profileId, bandId, patch)}
          onRemoveBand={(bandId) =>
            updateProfile(profileId, {
              bands: profile.bands.filter((band) => band.id !== bandId),
            })
          }
          onMoveBand={(from, to) => moveBand(profileId, from, to)}
        />
      ))}
    </ConfigEditorRoot>
  );
}

/** Options pour les sélecteurs de tranches d'âge (tarifs, etc.). */
export function buildAgeBandSelectOptions(
  config: RegistrationConfigV1
): Array<{ value: string; label: string }> {
  return Object.values(config.ageBandProfiles).flatMap((profile) =>
    profile.bands.map((band) => ({
      value: band.id,
      label: `${profile.label} — ${band.label}`,
    }))
  );
}
