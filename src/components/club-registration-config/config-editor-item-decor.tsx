import { VisibilityOff } from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import type { PricingProfileDefinition, RegistrationCompetition, RegistrationConfigV1, RegistrationSection, RegistrationSiteSlot } from "@/lib/club-registration-config/types";
import {
  getPricingProfileDef,
  profileAccent,
  profileIconKey,
} from "@/lib/club-registration-config/pricing-profiles";
import { resolveConfigEditorIcon } from "./config-editor-icons";
import type { ConfigEditorAccent } from "@/lib/club-registration-config/config-editor-accents";

export type { ConfigEditorAccent } from "@/lib/club-registration-config/config-editor-accents";

export type ConfigEditorItemDecor = {
  accent: ConfigEditorAccent;
  Icon: SvgIconComponent;
};

export function decorFromPricingProfile(def: PricingProfileDefinition): ConfigEditorItemDecor {
  return {
    accent: def.accent,
    Icon: resolveConfigEditorIcon(def.iconKey),
  };
}

export function sectionItemDecor(
  config: RegistrationConfigV1,
  section: RegistrationSection
): ConfigEditorItemDecor {
  if (!section.enabled) {
    return { accent: "warning", Icon: VisibilityOff };
  }
  const def = getPricingProfileDef(config, section.pricingProfile);
  if (def) return decorFromPricingProfile(def);
  return {
    accent: profileAccent(config, section.pricingProfile),
    Icon: resolveConfigEditorIcon(profileIconKey(config, section.pricingProfile)),
  };
}

export const siteItemDecor: ConfigEditorItemDecor = {
  accent: "primary",
  Icon: resolveConfigEditorIcon("place"),
};

export function slotItemDecor(slot: RegistrationSiteSlot): ConfigEditorItemDecor {
  if (!slot.enabled) {
    return { accent: "warning", Icon: VisibilityOff };
  }
  return { accent: "info", Icon: resolveConfigEditorIcon("schedule") };
}

export function ageBandProfileDecor(
  config: RegistrationConfigV1,
  profileId: string
): ConfigEditorItemDecor {
  const pricingDef = getPricingProfileDef(config, profileId);
  if (pricingDef) return decorFromPricingProfile(pricingDef);
  return { accent: "primary", Icon: resolveConfigEditorIcon("groups") };
}

export const ageBandItemDecor: ConfigEditorItemDecor = {
  accent: "info",
  Icon: resolveConfigEditorIcon("person"),
};

export const rateEntryDecor: ConfigEditorItemDecor = {
  accent: "success",
  Icon: resolveConfigEditorIcon("euro"),
};

export const discountRuleDecor: ConfigEditorItemDecor = {
  accent: "warning",
  Icon: resolveConfigEditorIcon("local_offer"),
};

export const aidRuleDecor: ConfigEditorItemDecor = {
  accent: "info",
  Icon: resolveConfigEditorIcon("volunteer"),
};

export function competitionItemDecor(comp: RegistrationCompetition): ConfigEditorItemDecor {
  if (!comp.enabled) {
    return { accent: "warning", Icon: VisibilityOff };
  }
  return { accent: "primary", Icon: resolveConfigEditorIcon("emoji_events") };
}

export const competitionBundleDecor: ConfigEditorItemDecor = {
  accent: "secondary",
  Icon: resolveConfigEditorIcon("merge"),
};

export function ageBandDecor(): ConfigEditorItemDecor {
  return ageBandItemDecor;
}
