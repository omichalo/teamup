"use client";

import { useSearchParams } from "next/navigation";
import { AuthCardSurface } from "@/components/auth/AuthCardSurface";
import { AuthForm } from "@/components/auth/AuthForm";
import { validateInternalRedirect } from "@/lib/auth/redirect-utils";

export function LoginContent() {
  const params = useSearchParams();
  const next = validateInternalRedirect(params?.get("next") ?? null);
  return (
    <AuthCardSurface title="Connexion">
      <AuthForm mode="login" next={next} />
    </AuthCardSurface>
  );
}
