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

/** Extrait le filename du header Content-Disposition si présent. */
export function resolveDownloadFileName(
  contentDisposition: string | null,
  fallback: string
): string {
  if (!contentDisposition) {
    return fallback;
  }
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // fallback below
    }
  }
  const plainMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }
  const bareMatch = /filename=([^;]+)/i.exec(contentDisposition);
  if (bareMatch?.[1]) {
    return bareMatch[1].trim().replace(/^"|"$/g, "");
  }
  return fallback;
}

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
  anchor.download = resolveDownloadFileName(
    res.headers.get("Content-Disposition"),
    `${meta.filePrefix}-${registrationId}.pdf`
  );
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
