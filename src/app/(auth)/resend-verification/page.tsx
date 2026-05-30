"use client";

import { AuthCardSurface } from "@/components/auth/AuthCardSurface";
import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";

export default function ResendVerificationPage() {
  return (
    <AuthCardSurface
      title="Renvoyer l’email de vérification"
      subtitle="Entrez votre adresse e-mail pour recevoir un nouveau lien de vérification."
    >
      <ResendVerificationForm />
    </AuthCardSurface>
  );
}
