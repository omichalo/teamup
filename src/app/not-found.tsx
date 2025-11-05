"use client";

import { useRouter } from "next/navigation";

// Force dynamic rendering to avoid static generation errors
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "16px",
      }}
    >
      <h1>404</h1>
      <h2>Page non trouvée</h2>
      <button onClick={() => router.push("/")}>
        Retour à l&apos;accueil
      </button>
    </div>
  );
}

