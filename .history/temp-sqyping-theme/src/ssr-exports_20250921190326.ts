// Exports SSR-safe pour @omichalo/sqyping-mui-theme
// Ce fichier est utilisé uniquement côté serveur
import React from "react";

export {
  ssrTheme as getTheme,
  SSRThemeProvider as AppThemeProvider,
  SSRThemeProvider as SSRSafeThemeProvider,
  useSSRColorMode as useColorMode,
  SSRHighlight as Highlight,
  SSRHighlightH1 as HighlightH1,
  SSRHighlightTitle as HighlightTitle,
} from "./ssr";

// StoryLayout SSR-safe
export const StoryLayout = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(
    "div",
    { suppressHydrationWarning: true },
    children
  );
};

// Re-export MUI components that are commonly used with the theme
export {
  ThemeProvider,
  CssBaseline,
  // Layout components
  Box,
  Container,
  Grid,
  Stack,
  // Typography
  Typography,
  // Navigation
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  // Data display
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Badge,
  Divider,
  // Inputs
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  // Feedback
  Alert,
  AlertTitle,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  // Navigation
  Menu,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  // Layout
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  // Data display
  Tooltip,
  Popover,
  Backdrop,
  // Utils
  ClickAwayListener,
  Portal,
  Fade,
  Grow,
  Slide,
  Zoom,
  Collapse,
} from "@mui/material";
export type { Theme } from "@mui/material/styles";
