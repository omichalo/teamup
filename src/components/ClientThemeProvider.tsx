"use client";

import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { createSqyPingTheme } from "@/theme/sqyping-theme";

const ThemeContext = createContext<
  | {
      mode: "light" | "dark";
      toggleColorMode: () => void;
    }
  | undefined
>(undefined);

export const useColorMode = (): {
  mode: "light" | "dark";
  toggleColorMode: () => void;
} => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useColorMode must be used within a ClientThemeProvider");
  }
  return context;
};

interface ClientThemeProviderProps {
  children: ReactNode;
  defaultMode?: "light" | "dark";
}

export const ClientThemeProvider: React.FC<ClientThemeProviderProps> = ({
  children,
  defaultMode = "light",
}) => {
  const [mode, setMode] = useState<"light" | "dark">(defaultMode);

  const toggleColorMode = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  /* On évite de recréer le thème à chaque render (créerait des cascades de
     re-render sur tous les composants MUI). La couleur est figée pour l'instant
     en mode clair côté client, le toggle reste exposé pour une évolution future. */
  const theme = useMemo(() => createSqyPingTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
