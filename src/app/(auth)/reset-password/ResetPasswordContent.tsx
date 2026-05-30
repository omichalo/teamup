"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AuthCardSurface } from "@/components/auth/AuthCardSurface";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams?.get("oobCode") ?? null;

  return (
    <AuthCardSurface title="Réinitialiser le mot de passe">
      <ResetPasswordForm
        oobCode={oobCode}
        onSuccess={() => router.push("/login")}
      />
    </AuthCardSurface>
  );
}
