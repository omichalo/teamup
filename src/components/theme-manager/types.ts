export interface ThemeManagerProps {
  themes: Theme[];
  currentTheme: string;
  onApplyTheme: (themeId: string) => Promise<void>;
  onCreateTheme: (theme: CreateTheme) => Promise<void>;
  onUpdateTheme: (themeId: string, theme: UpdateTheme) => Promise<void>;
  onDeleteTheme: (themeId: string) => Promise<void>;
  onExportTheme: (themeId: string) => Promise<void>;
  onImportTheme: (file: File) => Promise<void>;
  onPreviewTheme: (theme: Theme) => void;
  loading?: boolean;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  isPublic: boolean;
  colors: {
    primary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    background: {
      default: string;
      paper: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    error: { main: string; light: string; dark: string };
    warning: { main: string; light: string; dark: string };
    info: { main: string; light: string; dark: string };
    success: { main: string; light: string; dark: string };
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    fontWeightLight: number;
    fontWeightRegular: number;
    fontWeightMedium: number;
    fontWeightBold: number;
    h1: { fontSize: string; fontWeight: number; lineHeight: number };
    h2: { fontSize: string; fontWeight: number; lineHeight: number };
    h3: { fontSize: string; fontWeight: number; lineHeight: number };
    h4: { fontSize: string; fontWeight: number; lineHeight: number };
    h5: { fontSize: string; fontWeight: number; lineHeight: number };
    h6: { fontSize: string; fontWeight: number; lineHeight: number };
    body1: { fontSize: string; fontWeight: number; lineHeight: number };
    body2: { fontSize: string; fontWeight: number; lineHeight: number };
    caption: { fontSize: string; fontWeight: number; lineHeight: number };
    overline: { fontSize: string; fontWeight: number; lineHeight: number };
  };
  spacing: { unit: number; xs: number; sm: number; md: number; lg: number; xl: number };
  shape: { borderRadius: number };
  shadows: { elevation: number; color: string; opacity: number };
  components: Record<string, Record<string, unknown>>;
}

export interface CreateTheme {
  name: string;
  description: string;
  colors: Theme["colors"];
  typography: Theme["typography"];
  spacing: Theme["spacing"];
  shape: Theme["shape"];
  shadows: Theme["shadows"];
  components: Theme["components"];
}

export interface UpdateTheme {
  name?: string;
  description?: string;
  colors?: Partial<Theme["colors"]>;
  typography?: Partial<Theme["typography"]>;
  spacing?: Partial<Theme["spacing"]>;
  shape?: Partial<Theme["shape"]>;
  shadows?: Partial<Theme["shadows"]>;
  components?: Partial<Theme["components"]>;
}
