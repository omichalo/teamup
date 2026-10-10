import { Suspense } from "react";
import { LoginContent } from "./LoginContent";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Connexion");

function LoginFallback() {
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
