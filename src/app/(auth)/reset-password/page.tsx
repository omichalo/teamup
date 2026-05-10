import { Suspense } from "react";
import { ResetPasswordContent } from "./ResetPasswordContent";

function ResetPasswordFallback() {
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
