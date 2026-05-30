import { createTheme, type Theme } from "@mui/material/styles";

/**
 * Charte SQY PING — source de vérité unique pour les couleurs et la typographie.
 *
 * Toute modification de la marque doit passer par ce fichier : `ClientThemeProvider`,
 * `Layout`, et l'ensemble des écrans en héritent automatiquement via le ThemeProvider
 * MUI. On évite ainsi les overrides `globals.css` qui combattaient le thème
 * (cf. anciens `!important` sur `.MuiAppBar-root` et `.MuiButton-contained`).
 */

export const SQYPING_COLORS = {
  primary: {
    main: "#28306d",
    light: "#4a5a8a",
    dark: "#1a2147",
    contrastText: "#ffffff",
  },
  secondary: {
    main: "#f1861f",
    light: "#f4a64d",
    dark: "#d16a0a",
    contrastText: "#ffffff",
  },
  accent: "#ff6b35",
  surface: {
    /** Fond global légèrement teinté pour faire ressortir les cartes blanches. */
    background: "#f6f7fb",
    /** Fond des cartes / surfaces élevées. */
    paper: "#ffffff",
    /** Couleur des séparateurs subtils. */
    divider: "rgba(40, 48, 109, 0.08)",
  },
  text: {
    primary: "#1f2233",
    secondary: "#525871",
  },
} as const;

/**
 * Dégradé orange utilisé sur la bande haute / basse de l'AppBar. Exporté pour
 * permettre une réutilisation contrôlée (séparateurs de section, badges « brand »).
 */
export const SQYPING_GRADIENT =
  "linear-gradient(90deg, #f1861f 0%, #ff6b35 50%, #f1861f 100%)";

/**
 * Construit un thème MUI conforme à la charte SQY PING.
 *
 * Les overrides sont centralisés ici (Button, Card, Paper, TextField, Alert,
 * Stepper, LinearProgress…) pour que toute page du site bénéficie du même
 * traitement visuel sans avoir à le réimplémenter localement.
 */
export function createSqyPingTheme(mode: "light" | "dark" = "light"): Theme {
  return createTheme({
    palette: {
      mode,
      primary: SQYPING_COLORS.primary,
      secondary: SQYPING_COLORS.secondary,
      background: {
        default: SQYPING_COLORS.surface.background,
        paper: SQYPING_COLORS.surface.paper,
      },
      text: {
        primary: SQYPING_COLORS.text.primary,
        secondary: SQYPING_COLORS.text.secondary,
      },
      divider: SQYPING_COLORS.surface.divider,
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily:
        '"Figtree Variable", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: "3.25rem",
        fontWeight: 900,
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontSize: "2.5rem",
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: "-0.015em",
      },
      h3: {
        fontSize: "2rem",
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
      },
      h4: {
        fontSize: "1.75rem",
        fontWeight: 700,
        lineHeight: 1.35,
      },
      h5: {
        fontSize: "1.375rem",
        fontWeight: 700,
        lineHeight: 1.45,
      },
      h6: {
        fontSize: "1.125rem",
        fontWeight: 700,
        lineHeight: 1.5,
        letterSpacing: 0,
      },
      subtitle1: {
        fontSize: "1rem",
        fontWeight: 600,
        lineHeight: 1.6,
      },
      subtitle2: {
        fontSize: "0.875rem",
        fontWeight: 600,
        lineHeight: 1.6,
      },
      button: {
        textTransform: "none" as const,
        fontWeight: 600,
      },
      overline: {
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: SQYPING_COLORS.surface.background,
          },
          /* Anneau de focus visible et brandé pour tous les éléments
             interactifs au clavier — applicable à l'ensemble du site. */
          "button:focus-visible, a:focus-visible, [role='button']:focus-visible, [role='tab']:focus-visible":
            {
              outline: `2px solid ${SQYPING_COLORS.primary.main}`,
              outlineOffset: 2,
              borderRadius: 6,
            },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: SQYPING_COLORS.primary.main,
            color: SQYPING_COLORS.primary.contrastText,
            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
            position: "relative",
            borderRadius: 0,
            "&.MuiAppBar-colorPrimary": {
              backgroundColor: SQYPING_COLORS.primary.main,
            },
            "&::before, &::after": {
              content: '""',
              position: "absolute",
              left: 0,
              right: 0,
              height: 4,
              background: SQYPING_GRADIENT,
            },
            "&::before": { top: 0 },
            "&::after": { bottom: 0 },
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: "64px !important",
            paddingTop: 4,
            paddingBottom: 4,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
            paddingInline: 18,
            paddingBlock: 8,
          },
          contained: {
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
            "&:hover": {
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.18)",
            },
          },
          outlined: {
            borderWidth: 1.5,
            "&:hover": { borderWidth: 1.5 },
          },
          text: {
            paddingInline: 10,
          },
          sizeSmall: {
            paddingInline: 12,
            paddingBlock: 4,
          },
        },
      },
      MuiCard: {
        defaultProps: {
          variant: "outlined",
        },
        styleOverrides: {
          root: {
            borderRadius: 16,
            borderColor: SQYPING_COLORS.surface.divider,
            backgroundColor: SQYPING_COLORS.surface.paper,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            transition:
              "box-shadow 160ms ease-out, border-color 160ms ease-out, transform 160ms ease-out",
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 24,
            "&:last-child": { paddingBottom: 24 },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 12 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: SQYPING_COLORS.surface.paper,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: "1px solid",
            borderColor: "transparent",
          },
          standardInfo: {
            backgroundColor: "rgba(40, 48, 109, 0.06)",
            borderColor: "rgba(40, 48, 109, 0.18)",
            color: SQYPING_COLORS.text.primary,
          },
          standardWarning: {
            backgroundColor: "rgba(241, 134, 31, 0.10)",
            borderColor: "rgba(241, 134, 31, 0.35)",
          },
          standardError: {
            backgroundColor: "rgba(220, 38, 38, 0.08)",
            borderColor: "rgba(220, 38, 38, 0.30)",
          },
          standardSuccess: {
            backgroundColor: "rgba(34, 139, 75, 0.10)",
            borderColor: "rgba(34, 139, 75, 0.30)",
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
      MuiStepIcon: {
        styleOverrides: {
          root: {
            color: SQYPING_COLORS.surface.divider,
            "&.Mui-active": { color: SQYPING_COLORS.primary.main },
            "&.Mui-completed": { color: SQYPING_COLORS.secondary.main },
          },
          text: { fontWeight: 700 },
        },
      },
      MuiStepLabel: {
        styleOverrides: {
          label: {
            fontWeight: 600,
            "&.Mui-active": { fontWeight: 700 },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 8,
            borderRadius: 999,
            backgroundColor: "rgba(40, 48, 109, 0.10)",
          },
          bar: {
            borderRadius: 999,
            background: SQYPING_GRADIENT,
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            "&:before": { display: "none" },
            "&.Mui-expanded": { margin: 0 },
            border: "1px solid",
            borderColor: SQYPING_COLORS.surface.divider,
            boxShadow: "none",
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            minHeight: 56,
            "&.Mui-expanded": { minHeight: 56 },
          },
          content: {
            "&.Mui-expanded": { margin: "12px 0" },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: "0.75rem",
            backgroundColor: SQYPING_COLORS.primary.dark,
          },
          arrow: {
            color: SQYPING_COLORS.primary.dark,
          },
        },
      },
    },
  });
}
