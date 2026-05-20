import { createEmptyDraft } from "./registration-defaults";
import { validateStep } from "./step-validation";

describe("validateStep focusSelector", () => {
  it("pointe vers la déclaration médicale si le dossier est incomplet", () => {
    const draft = createEmptyDraft();
    draft.birthDate = "1975-07-22";
    const result = validateStep("admin", draft);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain("déclaration médicale");
      expect(result.focusSelector).toMatch(/medical/);
    }
  });
});
