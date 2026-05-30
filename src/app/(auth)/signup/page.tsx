"use client";

import { AuthCardSurface } from "@/components/auth/AuthCardSurface";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <AuthCardSurface title="Créer un compte">
      <AuthForm mode="signup" />
    </AuthCardSurface>
  );
}
