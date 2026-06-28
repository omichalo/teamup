import type { AidRule, AidRuleFormPresentation, RegistrationConfigV1 } from "./types";

export const DEFAULT_PASS_SPORT_FORM: Extract<AidRuleFormPresentation, { style: "toggle" }> = {
  style: "toggle",
  toggleLabel: "J'ai un Pass Sport",
  referenceCode: {
    label: "Code Pass Sport",
    helperText:
      "Code à 10 caractères communiqué par les services jeunesse / sport.",
    maxLength: 80,
  },
};

export function getAidRuleFormPresentation(rule: AidRule): AidRuleFormPresentation {
  return rule.form ?? { style: "checkbox" };
}

export function isToggleAidWithReferenceCode(
  rule: AidRule
): rule is AidRule & { form: Extract<AidRuleFormPresentation, { style: "toggle" }> } {
  return getAidRuleFormPresentation(rule).style === "toggle";
}

export function getCheckboxAidRules(config: RegistrationConfigV1): AidRule[] {
  return config.aidRules.filter((rule) => getAidRuleFormPresentation(rule).style === "checkbox");
}

export function getToggleAidRules(
  config: RegistrationConfigV1
): Array<AidRule & { form: Extract<AidRuleFormPresentation, { style: "toggle" }> }> {
  return config.aidRules.filter(isToggleAidWithReferenceCode);
}

export function repairAidRuleForm(rule: AidRule): AidRule {
  if (rule.id === "pass_sport" && !rule.form) {
    return { ...rule, form: DEFAULT_PASS_SPORT_FORM };
  }
  return rule;
}

export function repairAidRulesForm(config: RegistrationConfigV1): RegistrationConfigV1 {
  return {
    ...config,
    aidRules: config.aidRules.map(repairAidRuleForm),
  };
}

export function getAidRuleHelperText(rule: AidRule): string | undefined {
  const text = rule.helperText?.trim();
  return text && text.length > 0 ? text : undefined;
}

export function getAidRuleMaxAmountCents(rule: AidRule): number | undefined {
  const max = rule.maxAmountCents;
  if (max === undefined || max <= 0) return undefined;
  return max;
}

export function findAidRuleById(
  config: RegistrationConfigV1,
  aidId: string
): AidRule | undefined {
  return config.aidRules.find((rule) => rule.id === aidId);
}
