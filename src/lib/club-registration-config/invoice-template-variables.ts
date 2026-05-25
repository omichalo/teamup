export type InvoiceTemplateVariable = {
  key: string;
  label: string;
  description: string;
  example: string;
};

export const INVOICE_HEADER_TEMPLATE_VARIABLES: readonly InvoiceTemplateVariable[] = [
  {
    key: "clubName",
    label: "Nom du club",
    description: "Nom affiché du club (onglet Général).",
    example: "SQY Ping",
  },
  {
    key: "registrationId",
    label: "Référence dossier",
    description: "Identifiant court du dossier d'inscription.",
    example: "ABC123",
  },
  {
    key: "adherentName",
    label: "Nom de l'adhérent",
    description: "Prénom et nom de la personne inscrite.",
    example: "Jean Dupont",
  },
] as const;

export function invoiceVariableToken(key: string): string {
  return `{{${key}}}`;
}
