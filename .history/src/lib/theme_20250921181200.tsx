"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

// Couleurs SQY PING
const sqyPingColors = {
  navy: "#28306d",      // Couleur primaire
  orange: "#f1861f",    // Couleur secondaire
  blue: "#4267b0",      // Couleur info
  black: "#000000",     // Texte principal
  white: "#ffffff",     // Arrière-plan
};

// Types
type ColorMode = "light" | "dark";

interface ColorModeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
}

// Context
const ColorModeContext = createContext<ColorModeContextType | undefined>(undefined);

// Hook personnalisé
export const useColorMode = (): ColorModeContextType => {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error("useColorMode must be used within a CustomThemeProvider");
  }
  return context;
};

// Fonction pour créer le thème
const createSQYPingTheme = (mode: ColorMode) => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: sqyPingColors.navy,
        light: "#4a4d8a",
        dark: "#1a1d4a",
        contrastText: sqyPingColors.white,
      },
      secondary: {
        main: sqyPingColors.orange,
        light: "#f4a653",
        dark: "#c66d0a",
        contrastText: sqyPingColors.white,
      },
      info: {
        main: sqyPingColors.blue,
        light: "#6b8dd4",
        dark: "#2d4a7c",
        contrastText: sqyPingColors.white,
      },
      background: {
        default: mode === "dark" ? "#121212" : sqyPingColors.white,
        paper: mode === "dark" ? "#1e1e1e" : sqyPingColors.white,
      },
      text: {
        primary: mode === "dark" ? sqyPingColors.white : sqyPingColors.black,
        secondary: mode === "dark" ? "#b0b0b0" : "#666666",
      },
    },
    typography: {
      fontFamily: '"Figtree Variable", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 800,
        fontSize: "2.5rem",
        lineHeight: 1.2,
      },
      h2: {
        fontWeight: 700,
        fontSize: "2rem",
        lineHeight: 1.3,
      },
      h3: {
        fontWeight: 600,
        fontSize: "1.75rem",
        lineHeight: 1.4,
      },
      h4: {
        fontWeight: 600,
        fontSize: "1.5rem",
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 600,
        fontSize: "1.25rem",
        lineHeight: 1.5,
      },
      h6: {
        fontWeight: 600,
        fontSize: "1rem",
        lineHeight: 1.6,
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.6,
      },
    },
    shape: {
      borderRadius: 14, // Coins arrondis pour les boutons
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            textTransform: "none",
            fontWeight: 600,
            padding: "8px 16px",
          },
          contained: {
            boxShadow: "0 2px 8px rgba(40, 48, 109, 0.2)",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(40, 48, 109, 0.3)",
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18, // Coins arrondis pour les cards
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
            "&:hover": {
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.12)",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: sqyPingColors.navy,
            boxShadow: "0 2px 8px rgba(40, 48, 109, 0.2)",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 12,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: "12px !important",
            "&:before": {
              display: "none",
            },
            "&.Mui-expanded": {
              margin: "8px 0",
            },
          },
        },
      },
    },
  });
};

// Provider principal
interface CustomThemeProviderProps {
  children: ReactNode;
}

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ColorMode>("light");
  const [mounted, setMounted] = useState(false);

  // Charger le mode depuis localStorage au montage
  useEffect(() => {
    const savedMode = localStorage.getItem("colorMode") as ColorMode;
    if (savedMode && (savedMode === "light" || savedMode === "dark")) {
      setMode(savedMode);
    }
    setMounted(true);
  }, []);

  // Sauvegarder le mode dans localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("colorMode", mode);
    }
  }, [mode, mounted]);

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  const setColorMode = (newMode: ColorMode) => {
    setMode(newMode);
  };

  const theme = createSQYPingTheme(mode);

  // Éviter le flash de contenu non stylé
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode, setColorMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

// Export du thème pour usage externe
export const getTheme = (mode: ColorMode = "light") => createSQYPingTheme(mode);
