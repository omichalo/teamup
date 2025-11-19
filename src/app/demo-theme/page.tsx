"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Avatar,
  Badge,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  RadioGroup,
  Radio,
  FormLabel,
  Switch,
  Slider,
  Autocomplete,
  Tabs,
  Tab,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  // Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  // Stepper,
  // Step,
  // StepLabel,
  // Rating,
  // Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  Breadcrumbs,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  Add,
  // Delete,
  Home,
  Group,
  AccountCircle,
  ExpandMore,
  Settings,
  Dashboard,
  Mail as MailIcon,
  // Notifications,
  // Search,
  // FilterList,
  // MoreVert,
  // Star,
  // StarBorder,
  // Favorite,
  // FavoriteBorder,
  // ThumbUp,
  // ThumbDown,
  // Share,
  // Bookmark,
  // BookmarkBorder,
  SportsTennis as PingPongIcon,
} from "@mui/icons-material";

const top100Films = [
  { title: "The Shawshank Redemption", year: 1994 },
  { title: "The Godfather", year: 1972 },
  { title: "The Godfather: Part II", year: 1974 },
  { title: "The Dark Knight", year: 2008 },
  { title: "12 Angry Men", year: 1957 },
  { title: "Schindler&apos;s List", year: 1993 },
  { title: "Pulp Fiction", year: 1994 },
  { title: "The Lord of the Rings: The Return of the King", year: 2003 },
  { title: "The Good, the Bad and the Ugly", year: 1966 },
  { title: "The Fight Club", year: 1999 },
];

export default function DemoThemePage() {
  const [tabValue, setTabValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("option1");
  const [switchChecked, setSwitchChecked] = useState(true);
  const [sliderValue, setSliderValue] = useState<number | number[]>(30);
  // const [ratingValue, setRatingValue] = useState<number>(3);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleSnackbarClose = (
    _event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCheckboxChecked(event.target.checked);
  };

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRadioValue(event.target.value);
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSwitchChecked(event.target.checked);
  };

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    setSliderValue(newValue);
  };

  // const handleRatingChange = (
  //   event: React.SyntheticEvent,
  //   newValue: number | null
  // ) => {
  //   setRatingValue(newValue || 0);
  // };

  return (
      <Box sx={{ p: 5 }}>
        <Typography variant="h1" gutterBottom>
          SQY Ping Theme Showcase
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Découvrez tous les composants Material-UI stylisés avec le thème SQY
          Ping.
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="theme test tabs"
          >
            <Tab label="Palette & Typographie" />
            <Tab label="Boutons & Chips" />
            <Tab label="Formulaires" />
            <Tab label="Navigation" />
            <Tab label="Feedback" />
            <Tab label="Cards & Listes" />
            <Tab label="Tableau de Bord Complexe" />
            <Tab label="Formulaire Complexe" />
          </Tabs>
        </Box>

        {/* Tab 1: Palette & Typographie */}
        {tabValue === 0 && (
          <Box>
            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              AppBar & Navigation
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  AppBar avec Navigation
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <AppBar position="static" elevation={0}>
                    <Toolbar>
                      <PingPongIcon sx={{ mr: 2 }} />
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{ flexGrow: 1 }}
                      >
                        SQY Ping - Team Up
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mr: 2 }}>
                        <Button color="inherit" startIcon={<Dashboard />}>
                          Tableau de bord
                        </Button>
                        <Button color="inherit" startIcon={<Group />}>
                          Équipes
                        </Button>
                        <Button color="inherit" startIcon={<Settings />}>
                          Paramètres
                        </Button>
                      </Box>
                      <Switch size="small" sx={{ mr: 2 }} />
                      <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
                    </Toolbar>
                  </AppBar>
                </Box>
              </CardContent>
            </Card>

            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Palette de Couleurs
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 4 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h3" gutterBottom>
                      Couleurs Principales
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "primary.main",
                            borderRadius: 1,
                          }}
                        />
                        <Typography variant="body2">Primary Main</Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "secondary.main",
                            borderRadius: 1,
                          }}
                        />
                        <Typography variant="body2">Secondary Main</Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "info.main",
                            borderRadius: 1,
                          }}
                        />
                        <Typography variant="body2">Info Main</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h3" gutterBottom>
                      Couleurs d&apos;État
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "success.main",
                            borderRadius: 1,
                          }}
                        />
                        <Typography variant="body2">Success Main</Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "warning.main",
                            borderRadius: 1,
                          }}
                        />
                        <Typography variant="body2">Warning Main</Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "error.main",
                            borderRadius: 1,
                          }}
                        />
                        <Typography variant="body2">Error Main</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Typographie
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Exemples de Typographie
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Typography variant="h1">
                    Heading 1 - Titre principal
                  </Typography>
                  <Typography variant="h2">Heading 2 - Sous-titre</Typography>
                  <Typography variant="h3">Heading 3 - Section</Typography>
                  <Typography variant="h4">Heading 4 - Sous-section</Typography>
                  <Typography variant="h5">Heading 5 - Élément</Typography>
                  <Typography variant="h6">Heading 6 - Petit titre</Typography>
                  <Typography variant="subtitle1">
                    Subtitle 1 - Texte de support important
                  </Typography>
                  <Typography variant="subtitle2">
                    Subtitle 2 - Texte de support secondaire
                  </Typography>
                  <Typography variant="body1">
                    Body 1 - Texte principal. Lorem ipsum dolor sit amet,
                    consectetur adipiscing elit. Sed do eiusmod tempor
                    incididunt ut labore et dolore magna aliqua.
                  </Typography>
                  <Typography variant="body2">
                    Body 2 - Texte secondaire. Ut enim ad minim veniam, quis
                    nostrud exercitation ullamco laboris nisi ut aliquip ex ea
                    commodo consequat.
                  </Typography>
                  <Typography variant="caption">
                    Caption - Texte de légende ou petit texte
                  </Typography>
                  <Typography variant="overline">
                    Overline - Texte en majuscules
                  </Typography>
                  <Button variant="text">Button Text</Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Tab 2: Boutons & Chips */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Boutons
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Contained Buttons
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
                  <Button size="small" variant="contained">
                    Small
                  </Button>
                  <Button size="medium" variant="contained">
                    Medium
                  </Button>
                  <Button size="large" variant="contained">
                    Large
                  </Button>
                  <Button variant="contained" startIcon={<Add />}>
                    Avec icône
                  </Button>
                  <Button variant="contained" disabled>
                    Désactivé
                  </Button>
                </Box>

                <Typography variant="h3" gutterBottom>
                  Outlined Buttons
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
                  <Button size="small" variant="outlined">
                    Small
                  </Button>
                  <Button size="medium" variant="outlined">
                    Medium
                  </Button>
                  <Button size="large" variant="outlined">
                    Large
                  </Button>
                  <Button variant="outlined" startIcon={<Add />}>
                    Avec icône
                  </Button>
                  <Button variant="outlined" disabled>
                    Désactivé
                  </Button>
                </Box>

                <Typography variant="h3" gutterBottom>
                  Text Buttons
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Button size="small" variant="text">
                    Small
                  </Button>
                  <Button size="medium" variant="text">
                    Medium
                  </Button>
                  <Button size="large" variant="text">
                    Large
                  </Button>
                  <Button variant="text" startIcon={<Add />}>
                    Avec icône
                  </Button>
                  <Button variant="text" disabled>
                    Désactivé
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Chips
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Exemples de Chips
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Chip label="Basic Chip" />
                  <Chip label="Deletable" onDelete={() => {}} />
                  <Chip label="Clickable" onClick={() => {}} />
                  <Chip
                    label="Avatar Chip"
                    avatar={
                      <Avatar alt="Natacha" src="/static/images/avatar/1.jpg" />
                    }
                  />
                  <Chip label="Custom Color" color="primary" />
                  <Chip label="Outlined" variant="outlined" />
                  <Chip label="Disabled" disabled />
                </Box>
              </CardContent>
            </Card>

            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Badges
            </Typography>

            <Card>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Exemples de Badges
                </Typography>
                <Box sx={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <Badge badgeContent={4} color="primary">
                    <MailIcon color="action" />
                  </Badge>
                  <Badge badgeContent={4} color="secondary">
                    <MailIcon color="action" />
                  </Badge>
                  <Badge variant="dot" color="success">
                    <MailIcon color="action" />
                  </Badge>
                  <Badge badgeContent={100} max={99} color="error">
                    <MailIcon color="action" />
                  </Badge>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Tab 3: Formulaires */}
        {tabValue === 2 && (
          <Box>
            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Champs de Texte
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Exemples de TextField
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <TextField
                      fullWidth
                      label="Nom d'utilisateur"
                      variant="outlined"
                      defaultValue="JohnDoe"
                    />
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <TextField
                      fullWidth
                      label="Email"
                      variant="filled"
                      defaultValue="john.doe@example.com"
                    />
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <TextField
                      fullWidth
                      label="Mot de passe"
                      type="password"
                      variant="outlined"
                    />
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <TextField
                      fullWidth
                      label="Commentaire"
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Sélecteurs
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Exemples de Sélecteurs
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <FormControl fullWidth>
                      <InputLabel>Pays</InputLabel>
                      <Select value="france" label="Pays" onChange={() => {}}>
                        <MenuItem value="france">France</MenuItem>
                        <MenuItem value="belgium">Belgique</MenuItem>
                        <MenuItem value="switzerland">Suisse</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <Autocomplete
                      disablePortal
                      id="combo-box-demo"
                      options={top100Films}
                      sx={{ width: 300 }}
                      renderInput={(params) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { size, InputLabelProps, ...restParams } = params;
                        return (
                          <TextField
                            {...restParams}
                            label="Film"
                            variant="outlined"
                            size={size || "medium"}
                          />
                        );
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Contrôles
            </Typography>

            <Card>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Exemples de Contrôles
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checkboxChecked}
                            onChange={handleCheckboxChange}
                          />
                        }
                        label="Accepter les conditions"
                      />
                      <FormControlLabel
                        control={<Checkbox defaultChecked />}
                        label="Recevoir les notifications"
                      />
                      <FormControlLabel
                        control={<Checkbox disabled />}
                        label="Option désactivée"
                      />
                    </FormGroup>
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Options</FormLabel>
                      <RadioGroup
                        value={radioValue}
                        onChange={handleRadioChange}
                      >
                        <FormControlLabel
                          value="option1"
                          control={<Radio />}
                          label="Option 1"
                        />
                        <FormControlLabel
                          value="option2"
                          control={<Radio />}
                          label="Option 2"
                        />
                        <FormControlLabel
                          value="option3"
                          control={<Radio />}
                          label="Option 3"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={switchChecked}
                          onChange={handleSwitchChange}
                        />
                      }
                      label="Activer les notifications"
                    />
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <Typography gutterBottom>Volume</Typography>
                    <Slider
                      value={sliderValue}
                      onChange={handleSliderChange}
                      aria-labelledby="volume-slider"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Tab 4: Navigation */}
        {tabValue === 3 && (
          <Box>
            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Navigation
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Breadcrumbs
                </Typography>
                <Breadcrumbs aria-label="breadcrumb">
                  <Link underline="hover" color="inherit" href="/">
                    Accueil
                  </Link>
                  <Link
                    underline="hover"
                    color="inherit"
                    href="/material-ui/getting-started/installation/"
                  >
                    Core
                  </Link>
                  <Typography color="text.primary">Breadcrumb</Typography>
                </Breadcrumbs>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Drawer
                </Typography>
                <Button onClick={handleDrawerOpen}>Ouvrir le Drawer</Button>
                <Drawer
                  anchor="left"
                  open={drawerOpen}
                  onClose={handleDrawerClose}
                >
                  <Box sx={{ width: 250 }}>
                    <List>
                      <ListItem disablePadding>
                        <ListItemButton>
                          <ListItemIcon>
                            <Home />
                          </ListItemIcon>
                          <ListItemText primary="Accueil" />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemButton>
                          <ListItemIcon>
                            <Group />
                          </ListItemIcon>
                          <ListItemText primary="Équipes" />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemButton>
                          <ListItemIcon>
                            <Settings />
                          </ListItemIcon>
                          <ListItemText primary="Paramètres" />
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </Box>
                </Drawer>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Accordion
                </Typography>
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                  >
                    <Typography>Section 1</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                      Suspendisse malesuada lacus ex, sit amet blandit leo
                      lobortis eget.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    aria-controls="panel2a-content"
                    id="panel2a-header"
                  >
                    <Typography>Section 2</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                      Suspendisse malesuada lacus ex, sit amet blandit leo
                      lobortis eget.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Tab 5: Feedback */}
        {tabValue === 4 && (
          <Box>
            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Feedback
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Alerts
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Alert severity="error">
                    <AlertTitle>Erreur</AlertTitle>
                    Ceci est une alerte d&apos;erreur.
                  </Alert>
                  <Alert severity="warning">
                    <AlertTitle>Attention</AlertTitle>
                    Ceci est une alerte d&apos;avertissement.
                  </Alert>
                  <Alert severity="info">
                    <AlertTitle>Information</AlertTitle>
                    Ceci est une alerte d&apos;information.
                  </Alert>
                  <Alert severity="success">
                    <AlertTitle>Succès</AlertTitle>
                    Ceci est une alerte de succès.
                  </Alert>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Progress
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Typography>Progress Bar</Typography>
                  <LinearProgress />
                  <Typography>Progress Circle</Typography>
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <CircularProgress />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Snackbar
                </Typography>
                <Button onClick={() => setSnackbarOpen(true)}>
                  Ouvrir Snackbar
                </Button>
                <Snackbar
                  open={snackbarOpen}
                  autoHideDuration={6000}
                  onClose={handleSnackbarClose}
                  message="Ceci est un message de snackbar"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Dialog
                </Typography>
                <Button onClick={() => setDialogOpen(true)}>
                  Ouvrir Dialog
                </Button>
                <Dialog
                  open={dialogOpen}
                  onClose={handleDialogClose}
                  aria-labelledby="dialog-title"
                >
                  <DialogTitle id="dialog-title">Confirmation</DialogTitle>
                  <DialogContent>
                    <Typography>
                      Êtes-vous sûr de vouloir effectuer cette action ?
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleDialogClose}>Annuler</Button>
                    <Button onClick={handleDialogClose} autoFocus>
                      Confirmer
                    </Button>
                  </DialogActions>
                </Dialog>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Tab 6: Cards & Listes */}
        {tabValue === 5 && (
          <Box>
            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Cards & Listes
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              <Box sx={{ width: { xs: "100%", md: "50%" } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" gutterBottom>
                      Card Simple
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ceci est un exemple de card simple avec du contenu.
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ width: { xs: "100%", md: "50%" } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" gutterBottom>
                      Card avec Actions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ceci est un exemple de card avec des actions.
                    </Typography>
                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                      <Button size="small" variant="contained">
                        Action 1
                      </Button>
                      <Button size="small" variant="outlined">
                        Action 2
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Liste
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Home />
                    </ListItemIcon>
                    <ListItemText
                      primary="Accueil"
                      secondary="Page d'accueil de l'application"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Group />
                    </ListItemIcon>
                    <ListItemText
                      primary="Équipes"
                      secondary="Gestion des équipes"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Settings />
                    </ListItemIcon>
                    <ListItemText
                      primary="Paramètres"
                      secondary="Configuration de l'application"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Tab 7: Tableau de Bord Complexe */}
        {tabValue === 6 && (
          <Box>
            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Tableau de Bord Complexe
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Dashboard sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h4">Dashboard</Typography>
                    </Box>
                    <Typography variant="h4" color="primary">
                      1,234
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      +12% ce mois
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Group sx={{ mr: 1, color: "secondary.main" }} />
                      <Typography variant="h4">Utilisateurs</Typography>
                    </Box>
                    <Typography variant="h4" color="secondary">
                      567
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      +8% ce mois
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Settings sx={{ mr: 1, color: "info.main" }} />
                      <Typography variant="h4">Paramètres</Typography>
                    </Box>
                    <Typography variant="h4" color="info.main">
                      89
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      +3% ce mois
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <AccountCircle sx={{ mr: 1, color: "success.main" }} />
                      <Typography variant="h4">Profils</Typography>
                    </Box>
                    <Typography variant="h4" color="success.main">
                      234
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      +15% ce mois
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Tableau de Données
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nom</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Rôle</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>John Doe</TableCell>
                        <TableCell>john@example.com</TableCell>
                        <TableCell>Admin</TableCell>
                        <TableCell>
                          <Chip label="Actif" color="success" size="small" />
                        </TableCell>
                        <TableCell>
                          <Button size="small">Modifier</Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Jane Smith</TableCell>
                        <TableCell>jane@example.com</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>
                          <Chip label="Inactif" color="error" size="small" />
                        </TableCell>
                        <TableCell>
                          <Button size="small">Modifier</Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Tab 8: Formulaire Complexe */}
        {tabValue === 7 && (
          <Box>
            <Typography variant="h2" gutterBottom sx={{ mb: 3 }}>
              Formulaire Complexe
            </Typography>

            <Card>
              <CardContent>
                <Typography variant="h3" gutterBottom>
                  Informations Personnelles
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <TextField fullWidth label="Prénom" variant="outlined" />
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <TextField fullWidth label="Nom" variant="outlined" />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      variant="outlined"
                    />
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <FormControl fullWidth>
                      <InputLabel>Pays</InputLabel>
                      <Select value="" label="Pays" onChange={() => {}}>
                        <MenuItem value="france">France</MenuItem>
                        <MenuItem value="belgium">Belgique</MenuItem>
                        <MenuItem value="switzerland">Suisse</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                    <TextField fullWidth label="Téléphone" variant="outlined" />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <FormGroup>
                      <FormControlLabel
                        control={<Checkbox />}
                        label="J'accepte les conditions d'utilisation"
                      />
                      <FormControlLabel
                        control={<Checkbox />}
                        label="Je souhaite recevoir les newsletters"
                      />
                    </FormGroup>
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button variant="outlined">Annuler</Button>
                      <Button variant="contained">Enregistrer</Button>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
  );
}
