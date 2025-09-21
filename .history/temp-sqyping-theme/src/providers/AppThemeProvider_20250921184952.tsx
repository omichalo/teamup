"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getTheme } from "../theme";
import { SSRSafeThemeProvider } from "./SSRSafeThemeProvider";
import { FontProvider } from "../components/FontProvider";
import {
  isServer,
  canUseLocalStorage,
} from "../utils/environment";

// Types
type ColorMode = "light" | "dark";

interface ColorModeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
}

// Context
const ColorModeContext = createContext<ColorModeContextType | undefined>(
  undefined
);

// Hook personnalisé
export const useColorMode = (): ColorModeContextType => {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error("useColorMode must be used within an AppThemeProvider");
  }
  return context;
};

// Props du provider
interface AppThemeProviderProps {
  children: ReactNode;
  defaultMode?: ColorMode;
}

// Provider principal
export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({
  children,
  defaultMode = "light",
}) => {
  // Initialiser le mode avec une valeur par défaut, puis le charger depuis localStorage
  const [mode, setMode] = useState<ColorMode>(() => {
    // Si on est côté client et qu'on peut accéder à localStorage, essayer de charger le mode sauvegardé
    if (canUseHooks && canUseLocalStorage) {
      try {
        const savedMode = localStorage.getItem(
          "sqyping-color-mode"
        ) as ColorMode;
        if (savedMode && (savedMode === "light" || savedMode === "dark")) {
          return savedMode;
        }
      } catch (error) {
        console.warn("Failed to load color mode from localStorage:", error);
      }
    }
    return defaultMode;
  });

  // Sauvegarder le mode dans localStorage quand il change (client-side only)
  useEffect(() => {
    if (!canUseHooks || !canUseLocalStorage) return;

    try {
      localStorage.setItem("sqyping-color-mode", mode);
    } catch (error) {
      console.warn("Failed to save color mode to localStorage:", error);
    }
  }, [mode]);

  // Fonction pour basculer le mode
  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  // Fonction pour définir un mode spécifique
  const setColorMode = (newMode: ColorMode) => {
    setMode(newMode);
  };

  // Créer le thème basé sur le mode actuel
  const theme = getTheme(mode);

  // Valeur du context
  const contextValue: ColorModeContextType = {
    mode,
    toggleColorMode,
    setColorMode,
  };

  // Toujours fournir le contexte, même pendant le rendu SSR
  return (
    <ColorModeContext.Provider value={contextValue}>
      <FontProvider>
        <SSRSafeThemeProvider theme={theme}>{children}</SSRSafeThemeProvider>
      </FontProvider>
    </ColorModeContext.Provider>
  );
};

// Export par défaut
export default AppThemeProvider;
