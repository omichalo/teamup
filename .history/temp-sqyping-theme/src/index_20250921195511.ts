// SQY PING MUI Theme - Main Export (Client-side)
export { getTheme } from "./theme";
export { AppThemeProvider, useColorMode } from "./providers/AppThemeProvider";
export { SSRSafeThemeProvider } from "./providers/SSRSafeThemeProvider";
export {
  Highlight,
  HighlightH1,
  HighlightH2,
  HighlightH3,
  HighlightTitle,
} from "./components/Highlight";
export { StoryLayout } from "./components/StoryLayout";
export { FontProvider } from "./components/FontProvider";

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
