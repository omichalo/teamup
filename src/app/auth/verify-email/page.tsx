import { Suspense } from "react";
import { VerifyEmailContent } from "./VerifyEmailContent";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Vérifier l'e-mail");

function VerifyEmailFallback() {
  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "40vh",
      }}
    >
      <p style={{ margin: 0 }}>Chargement...</p>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
