"use client";

import { AuthCardSurface } from "@/components/auth/AuthCardSurface";
import { AuthForm } from "@/components/auth/AuthForm";

export default function ResetPage() {
  return (
    <AuthCardSurface title="Mot de passe oublié">
      <AuthForm mode="forgot-password" />
    </AuthCardSurface>
  );
}
