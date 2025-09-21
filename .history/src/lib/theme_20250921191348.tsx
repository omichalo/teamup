"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  ThemeProvider as MUIThemeProvider,
  createTheme,
  Theme,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

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
    throw new Error("useColorMode must be used within a ThemeProvider");
  }
  return context;
};

// Props du provider
interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ColorMode;
}

// Créer le thème SQY PING
const createSQYPingTheme = (mode: ColorMode): Theme => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#f1861f", // Orange SQY PING
        light: "#ffb74d",
        dark: "#e65100",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#ffcc02", // Jaune SQY PING
        light: "#fff176",
        dark: "#f57f17",
        contrastText: "#000000",
      },
      background: {
        default: mode === "light" ? "#fafafa" : "#121212",
        paper: mode === "light" ? "#ffffff" : "#1e1e1e",
      },
      text: {
        primary: mode === "light" ? "#212121" : "#ffffff",
        secondary: mode === "light" ? "#757575" : "#b0b0b0",
      },
    },
    typography: {
      fontFamily:
        '"Figtree Variable", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: "2.5rem",
        lineHeight: 1.2,
      },
      h2: {
        fontWeight: 600,
        fontSize: "2rem",
        lineHeight: 1.3,
      },
      h3: {
        fontWeight: 600,
        fontSize: "1.75rem",
        lineHeight: 1.4,
      },
      h4: {
        fontWeight: 500,
        fontSize: "1.5rem",
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 500,
        fontSize: "1.25rem",
        lineHeight: 1.5,
      },
      h6: {
        fontWeight: 500,
        fontSize: "1rem",
        lineHeight: 1.6,
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.5,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.43,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow:
              mode === "light"
                ? "0 2px 8px rgba(0,0,0,0.1)"
                : "0 2px 8px rgba(0,0,0,0.3)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "light" ? "#f1861f" : "#1e1e1e",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          },
        },
      },
    },
  });
};

// Provider principal
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = "light",
}) => {
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
  const theme = createSQYPingTheme(mode);

  // Valeur du context
  const contextValue: ColorModeContextType = {
    mode,
    toggleColorMode,
    setColorMode,
  };

  return (
    <ColorModeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default ThemeProvider;
