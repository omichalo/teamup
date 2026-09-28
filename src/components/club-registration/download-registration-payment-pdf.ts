export type RegistrationPaymentDocumentKind = "invoice" | "payment-receipt";

const DOCUMENT_META: Record<
  RegistrationPaymentDocumentKind,
  { pathSegment: string; filePrefix: string; fallbackError: string }
> = {
  invoice: {
    pathSegment: "invoice",
    filePrefix: "facture-adhesion",
    fallbackError: "Facture indisponible pour le moment.",
  },
  "payment-receipt": {
    pathSegment: "payment-receipt",
    filePrefix: "recu-adhesion",
    fallbackError: "Reçu indisponible pour le moment.",
  },
};

/** Télécharge un PDF facture/reçu depuis l’API club registration. */
export async function downloadRegistrationPaymentPdf(
  registrationId: string,
  kind: RegistrationPaymentDocumentKind
): Promise<void> {
  const meta = DOCUMENT_META[kind];
  const res = await fetch(
    `/api/club/registration/${encodeURIComponent(registrationId)}/${meta.pathSegment}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? meta.fallbackError);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${meta.filePrefix}-${registrationId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
