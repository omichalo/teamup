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
  // Initialiser le mode avec une valeur par défaut
  const [mode, setMode] = useState<ColorMode>(defaultMode);
  const [isClient, setIsClient] = useState(false);

  // Détecter si on est côté client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Charger le mode depuis localStorage au montage du composant (client-side only)
  useEffect(() => {
    if (!isClient) return;

    try {
      const savedMode = localStorage.getItem("sqyping-color-mode") as ColorMode;
      if (savedMode && (savedMode === "light" || savedMode === "dark")) {
        setMode(savedMode);
      }
    } catch (error) {
      console.warn("Failed to load color mode from localStorage:", error);
    }
  }, [isClient]);

  // Sauvegarder le mode dans localStorage quand il change (client-side only)
  useEffect(() => {
    if (!isClient) return;

    try {
      localStorage.setItem("sqyping-color-mode", mode);
    } catch (error) {
      console.warn("Failed to save color mode to localStorage:", error);
    }
  }, [mode, isClient]);

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
