"use client";

import { usePathname } from "next/navigation";
import { Layout } from "./Layout";

// Routes qui ne doivent pas avoir le Layout avec navigation
const AUTH_ROUTES = ["/login", "/signup", "/reset", "/reset-password", "/auth/verify-email"];

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname?.startsWith(route));

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return <Layout>{children}</Layout>;
}

