import { Suspense } from "react";
import { VerifyEmailContent } from "./VerifyEmailContent";

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
