"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";

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
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: "#28306d", // Navy SQY PING
        light: "#4a5a8a",
        dark: "#1a2147",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#f1861f", // Orange SQY PING
        light: "#f4a64d",
        dark: "#d16a0a",
        contrastText: "#ffffff",
      },
    },
    typography: {
      fontFamily:
        '"Figtree Variable", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: "3.5rem", // 56px
        fontWeight: 900,
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontSize: "2.75rem", // 44px
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: "-0.015em",
      },
      h3: {
        fontSize: "2.25rem", // 36px
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
      },
      h4: {
        fontSize: "1.875rem", // 30px
        fontWeight: 700,
        lineHeight: 1.4,
        letterSpacing: "0em",
      },
      h5: {
        fontSize: "1.5rem", // 24px
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: "0em",
      },
      h6: {
        fontSize: "1.25rem", // 20px
        fontWeight: 600,
        lineHeight: 1.6,
        letterSpacing: "0.0075em",
      },
      button: {
        textTransform: "none" as const,
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            backgroundColor: "#28306d", // Navy SQY PING
            position: "relative",
            borderRadius: 0, // Supprimer les arrondis
            "&.MuiAppBar-colorPrimary": {
              backgroundColor: "#28306d",
            },
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background:
                "linear-gradient(90deg, #f1861f 0%, #ff6b35 50%, #f1861f 100%)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "4px",
              background:
                "linear-gradient(90deg, #f1861f 0%, #ff6b35 50%, #f1861f 100%)",
            },
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: "64px !important",
            paddingTop: "4px", // Espace pour la bande orange du haut
            paddingBottom: "4px", // Espace pour la bande orange du bas
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
