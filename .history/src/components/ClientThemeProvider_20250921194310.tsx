"use client";

import { AppThemeProvider } from "@omichalo/sqyping-mui-theme";

interface ClientThemeProviderProps {
  children: React.ReactNode;
}

export function ClientThemeProvider({ children }: ClientThemeProviderProps) {
  return <AppThemeProvider>{children}</AppThemeProvider>;
}
