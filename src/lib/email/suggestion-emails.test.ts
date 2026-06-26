import { buildSuggestionStatusChangedEmail } from "@/lib/email/suggestion-emails";

describe("buildSuggestionStatusChangedEmail", () => {
  it("inclut le lien direct vers l'idée", () => {
    const mail = buildSuggestionStatusChangedEmail({
      title: "Export Excel",
      suggestionId: "abc123",
      appOrigin: "https://teamup.example.com",
      previousStatus: "received",
      newStatus: "planned",
      maintainerDisplayName: "Olivier",
    });

    expect(mail.subject).toContain("Export Excel");
    expect(mail.html).toContain("/club/idees?id=abc123");
    expect(mail.text).toContain("Planifiée");
    expect(mail.html).toContain("Reçue");
  });
});
