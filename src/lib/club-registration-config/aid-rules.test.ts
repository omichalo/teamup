import { getDefaultRegistrationConfig } from "./default-config";
import {
  DEFAULT_PASS_SPORT_FORM,
  getCheckboxAidRules,
  getToggleAidRules,
  repairAidRuleForm,
} from "./aid-rules";

describe("aid-rules helpers", () => {
  it("identifie Pass Sport comme aide interrupteur + code dans le seed", () => {
    const config = getDefaultRegistrationConfig();
    const toggleAids = getToggleAidRules(config);
    expect(toggleAids.map((rule) => rule.id)).toContain("pass_sport");
    expect(getCheckboxAidRules(config).map((rule) => rule.id)).toEqual([
      "pass_plus",
      "labaz",
      "aide_municipale",
    ]);
  });

  it("répare une aide pass_sport legacy sans form", () => {
    expect(
      repairAidRuleForm({
        id: "pass_sport",
        label: "Pass Sport",
        effect: { type: "admin_review" },
      }).form
    ).toEqual(DEFAULT_PASS_SPORT_FORM);
  });
});
