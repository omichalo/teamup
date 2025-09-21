"use client";

import { ThemeProvider } from "@/lib/theme";

interface ClientThemeProviderProps {
  children: React.ReactNode;
}

export function ClientThemeProvider({ children }: ClientThemeProviderProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
