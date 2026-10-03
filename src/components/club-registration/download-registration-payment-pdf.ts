export type RegistrationPaymentDocumentKind =
  | "invoice"
  | "payment-situation"
  | "payment-receipt";

const DOCUMENT_META: Record<
  "invoice" | "payment-situation",
  { pathSegment: string; filePrefix: string; fallbackError: string }
> = {
  invoice: {
    pathSegment: "invoice",
    filePrefix: "facture-adhesion",
    fallbackError: "Facture indisponible pour le moment.",
  },
  "payment-situation": {
    pathSegment: "payment-situation",
    filePrefix: "situation-adhesion",
    fallbackError: "État de situation indisponible pour le moment.",
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

async function triggerBlobDownload(
  res: Response,
  fallbackFileName: string
): Promise<void> {
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = resolveDownloadFileName(
    res.headers.get("Content-Disposition"),
    fallbackFileName
  );
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Télécharge facture ou état de situation. */
export async function downloadRegistrationPaymentPdf(
  registrationId: string,
  kind: "invoice" | "payment-situation" | "payment-receipt"
): Promise<void> {
  // Compat : ancien « payment-receipt » cumulatif → état de situation
  const resolvedKind = kind === "payment-receipt" ? "payment-situation" : kind;
  const meta = DOCUMENT_META[resolvedKind];
  const res = await fetch(
    `/api/club/registration/${encodeURIComponent(registrationId)}/${meta.pathSegment}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? meta.fallbackError);
  }
  await triggerBlobDownload(res, `${meta.filePrefix}-${registrationId}.pdf`);
}

/** Télécharge une pièce FAC / complément / avoir figée. */
export async function downloadRegistrationInvoicePdf(
  registrationId: string,
  invoiceId: string
): Promise<void> {
  const res = await fetch(
    `/api/club/registration/${encodeURIComponent(registrationId)}/invoice/${encodeURIComponent(invoiceId)}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? "Facture indisponible pour le moment.");
  }
  await triggerBlobDownload(res, `facture-adhesion-${registrationId}-${invoiceId}.pdf`);
}

/** Télécharge un reçu unitaire (pièce REC). */
export async function downloadRegistrationUnitReceiptPdf(
  registrationId: string,
  receivedPaymentId: string
): Promise<void> {
  const res = await fetch(
    `/api/club/registration/${encodeURIComponent(registrationId)}/payment-receipt/${encodeURIComponent(receivedPaymentId)}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? "Reçu indisponible pour le moment.");
  }
  await triggerBlobDownload(
    res,
    `recu-adhesion-${registrationId}-${receivedPaymentId}.pdf`
  );
}

/** Télécharge un justificatif d'aide reçue (pièce AID). */
export async function downloadRegistrationAidReceiptPdf(
  registrationId: string,
  aidType: string
): Promise<void> {
  const res = await fetch(
    `/api/club/registration/${encodeURIComponent(registrationId)}/aid-receipt/${encodeURIComponent(aidType)}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? "Justificatif d'aide indisponible pour le moment.");
  }
  await triggerBlobDownload(
    res,
    `aide-adhesion-${registrationId}-${aidType}.pdf`
  );
}

/** Télécharge l'attestation d'inscription (document informatif). */
export async function downloadRegistrationCertificatePdf(
  registrationId: string
): Promise<void> {
  const res = await fetch(
    `/api/club/registration/${encodeURIComponent(registrationId)}/registration-certificate`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(
      json?.error ?? "Attestation d'inscription indisponible pour le moment."
    );
  }
  await triggerBlobDownload(res, `attestation-inscription-${registrationId}.pdf`);
}
