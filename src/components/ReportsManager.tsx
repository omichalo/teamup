"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  TableChart as TableChartIcon,
  PlayArrow as PlayIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

interface ReportsManagerProps {
  reports: Report[];
  onCreateReport: (report: CreateReport) => Promise<void>;
  onUpdateReport: (id: string, report: UpdateReport) => Promise<void>;
  onDeleteReport: (id: string) => Promise<void>;
  onRunReport: (id: string) => Promise<void>;
  onScheduleReport: (id: string, schedule: ReportSchedule) => Promise<void>;
  onGetReportData: (id: string) => Promise<ReportData>;
  onExportReport: (
    id: string,
    format: "pdf" | "excel" | "csv"
  ) => Promise<void>;
  loading?: boolean;
}

interface Report {
  id: string;
  name: string;
  description: string;
  type: "table" | "chart" | "dashboard" | "summary";
  category:
    | "players"
    | "teams"
    | "matches"
    | "championships"
    | "financial"
    | "performance";
  status: "draft" | "active" | "paused" | "archived";
  dataSource: string;
  query: string;
  parameters: {
    [key: string]: unknown;
  };
  filters: {
    field: string;
    operator: string;
    value: unknown;
  }[];
  sorting: {
    field: string;
    direction: "asc" | "desc";
  }[];
  grouping: {
    field: string;
    function: "count" | "sum" | "avg" | "min" | "max";
  }[];
  visualization: {
    chartType: "bar" | "line" | "pie" | "scatter" | "area";
    colors: string[];
    showLegend: boolean;
    showGrid: boolean;
    showLabels: boolean;
  };
  schedule?: {
    frequency: "daily" | "weekly" | "monthly" | "quarterly";
    time: string;
    days: number[];
    enabled: boolean;
  };
  permissions: {
    view: string[];
    edit: string[];
    run: string[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastRun?: string;
  runCount: number;
  averageRunTime: number;
}

interface CreateReport {
  name: string;
  description: string;
  type: "table" | "chart" | "dashboard" | "summary";
  category:
    | "players"
    | "teams"
    | "matches"
    | "championships"
    | "financial"
    | "performance";
  dataSource: string;
  query: string;
  parameters: {
    [key: string]: unknown;
  };
  filters: {
    field: string;
    operator: string;
    value: unknown;
  }[];
  sorting: {
    field: string;
    direction: "asc" | "desc";
  }[];
  grouping: {
    field: string;
    function: "count" | "sum" | "avg" | "min" | "max";
  }[];
  visualization: {
    chartType: "bar" | "line" | "pie" | "scatter" | "area";
    colors: string[];
    showLegend: boolean;
    showGrid: boolean;
    showLabels: boolean;
  };
  permissions: {
    view: string[];
    edit: string[];
    run: string[];
  };
}

interface UpdateReport {
  name?: string;
  description?: string;
  type?: "table" | "chart" | "dashboard" | "summary";
  category?:
    | "players"
    | "teams"
    | "matches"
    | "championships"
    | "financial"
    | "performance";
  dataSource?: string;
  query?: string;
  parameters?: {
    [key: string]: unknown;
  };
  filters?: {
    field: string;
    operator: string;
    value: unknown;
  }[];
  sorting?: {
    field: string;
    direction: "asc" | "desc";
  }[];
  grouping?: {
    field: string;
    function: "count" | "sum" | "avg" | "min" | "max";
  }[];
  visualization?: {
    chartType: "bar" | "line" | "pie" | "scatter" | "area";
    colors: string[];
    showLegend: boolean;
    showGrid: boolean;
    showLabels: boolean;
  };
  permissions?: {
    view: string[];
    edit: string[];
    run: string[];
  };
}

interface ReportSchedule {
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  time: string;
  days: number[];
  enabled: boolean;
}

interface ReportData {
  columns: string[];
  rows: unknown[][];
  summary: {
    totalRows: number;
    totalColumns: number;
    executionTime: number;
    generatedAt: string;
  };
  metadata: {
    [key: string]: unknown;
  };
}

export function ReportsManager({
  reports,
  onCreateReport,
  onUpdateReport,
  onDeleteReport,
  onRunReport,
  onScheduleReport,
  onGetReportData,
  onExportReport,
  loading = false,
}: ReportsManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [newReport, setNewReport] = useState<CreateReport>({
    name: "",
    description: "",
    type: "table",
    category: "players",
    dataSource: "players",
    query: "",
    parameters: {},
    filters: [],
    sorting: [],
    grouping: [],
    visualization: {
      chartType: "bar",
      colors: ["#1976d2", "#dc004e", "#9c27b0", "#2e7d32", "#f57c00"],
      showLegend: true,
      showGrid: true,
      showLabels: true,
    },
    permissions: {
      view: [],
      edit: [],
      run: [],
    },
  });
  const [newSchedule, setNewSchedule] = useState<ReportSchedule>({
    frequency: "daily",
    time: "09:00",
    days: [],
    enabled: true,
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reportTypes = [
    { value: "table", label: "Tableau", icon: <TableChartIcon /> },
    { value: "chart", label: "Graphique", icon: <BarChartIcon /> },
    { value: "dashboard", label: "Tableau de bord", icon: <AssessmentIcon /> },
    { value: "summary", label: "Résumé", icon: <InfoIcon /> },
  ];

  const categories = [
    { value: "players", label: "Joueurs", color: "primary" },
    { value: "teams", label: "Équipes", color: "secondary" },
    { value: "matches", label: "Matchs", color: "info" },
    { value: "championships", label: "Championnats", color: "success" },
    { value: "financial", label: "Financier", color: "warning" },
    { value: "performance", label: "Performance", color: "error" },
  ];

  const chartTypes = [
    { value: "bar", label: "Barres", icon: <BarChartIcon /> },
    { value: "line", label: "Lignes", icon: <TimelineIcon /> },
    { value: "pie", label: "Secteurs", icon: <PieChartIcon /> },
    { value: "scatter", label: "Dispersion", icon: <BarChartIcon /> },
    { value: "area", label: "Aires", icon: <BarChartIcon /> },
  ];

  const frequencies = [
    { value: "daily", label: "Quotidien" },
    { value: "weekly", label: "Hebdomadaire" },
    { value: "monthly", label: "Mensuel" },
    { value: "quarterly", label: "Trimestriel" },
  ];

  const handleCreateReport = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onCreateReport(newReport);
      setCreateDialogOpen(false);
      setNewReport({
        name: "",
        description: "",
        type: "table",
        category: "players",
        dataSource: "players",
        query: "",
        parameters: {},
        filters: [],
        sorting: [],
        grouping: [],
        visualization: {
          chartType: "bar",
          colors: ["#1976d2", "#dc004e", "#9c27b0", "#2e7d32", "#f57c00"],
          showLegend: true,
          showGrid: true,
          showLabels: true,
        },
        permissions: {
          view: [],
          edit: [],
          run: [],
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;

    try {
      setProcessing(true);
      setError(null);
      await onUpdateReport(selectedReport.id, newReport);
      setEditDialogOpen(false);
      setSelectedReport(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce rapport ?")) {
      try {
        await onDeleteReport(id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    }
  };

  const handleRunReport = async (id: string) => {
    try {
      setProcessing(true);
      setError(null);
      await onRunReport(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l&apos;exécution"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleReport = async (id: string) => {
    try {
      setProcessing(true);
      setError(null);
      await onScheduleReport(id, newSchedule);
      setScheduleDialogOpen(false);
      setSelectedReport(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la planification"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleViewData = async (report: Report) => {
    try {
      setProcessing(true);
      setError(null);
      const data = await onGetReportData(report.id);
      setSelectedReport(report);
      setReportData(data);
      setDataDialogOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des données"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleExportReport = async (
    id: string,
    format: "pdf" | "excel" | "csv"
  ) => {
    try {
      await onExportReport(id, format);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l&apos;export"
      );
    }
  };

  const getTypeIcon = (type: string) => {
    const typeObj = reportTypes.find((t) => t.value === type);
    return typeObj ? typeObj.icon : <AssessmentIcon />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "table":
        return "primary";
      case "chart":
        return "secondary";
      case "dashboard":
        return "info";
      case "summary":
        return "success";
      default:
        return "default";
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find((c) => c.value === category);
    return cat ? cat.color : "default";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "draft":
        return "default";
      case "paused":
        return "warning";
      case "archived":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon color="success" />;
      case "draft":
        return <InfoIcon color="inherit" />;
      case "paused":
        return <WarningIcon color="warning" />;
      case "archived":
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="inherit" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${Math.round(milliseconds / 1000)}s`;
    if (milliseconds < 3600000) return `${Math.round(milliseconds / 60000)}min`;
    return `${Math.round(milliseconds / 3600000)}h`;
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Gestion des rapports</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Nouveau rapport
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          gap: 3,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Rapports disponibles
              </Typography>
              {loading ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minHeight="200px"
                >
                  <CircularProgress />
                </Box>
              ) : reports.length === 0 ? (
                <Alert severity="info">Aucun rapport trouvé</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nom</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Catégorie</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Dernière exécution</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {report.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {report.description}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getTypeIcon(report.type)}
                              <Chip
                                label={
                                  reportTypes.find(
                                    (t) => t.value === report.type
                                  )?.label
                                }
                                color={
                                  getTypeColor(report.type) as
                                    | "default"
                                    | "primary"
                                    | "secondary"
                                    | "error"
                                    | "info"
                                    | "success"
                                    | "warning"
                                }
                                size="small"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                categories.find(
                                  (c) => c.value === report.category
                                )?.label
                              }
                              color={
                                getCategoryColor(report.category) as
                                  | "default"
                                  | "primary"
                                  | "secondary"
                                  | "error"
                                  | "info"
                                  | "success"
                                  | "warning"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getStatusIcon(report.status)}
                              <Chip
                                label={report.status}
                                color={
                                  getStatusColor(report.status) as
                                    | "default"
                                    | "primary"
                                    | "secondary"
                                    | "error"
                                    | "info"
                                    | "success"
                                    | "warning"
                                }
                                size="small"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {report.lastRun
                                ? formatDate(report.lastRun)
                                : "Jamais"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {report.runCount} exécution(s)
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Exécuter">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRunReport(report.id)}
                                  disabled={processing}
                                >
                                  <PlayIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Voir les données">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewData(report)}
                                >
                                  <AssessmentIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Planifier">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setScheduleDialogOpen(true);
                                  }}
                                >
                                  <ScheduleIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Exporter PDF">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleExportReport(report.id, "pdf")
                                  }
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Modifier">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setNewReport({
                                      name: report.name,
                                      description: report.description,
                                      type: report.type,
                                      category: report.category,
                                      dataSource: report.dataSource,
                                      query: report.query,
                                      parameters: report.parameters,
                                      filters: report.filters,
                                      sorting: report.sorting,
                                      grouping: report.grouping,
                                      visualization: report.visualization,
                                      permissions: report.permissions,
                                    });
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteReport(report.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: "100%", md: "33.33%" } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions rapides
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  disabled={processing}
                >
                  Créer un rapport
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => setScheduleDialogOpen(true)}
                  disabled={processing}
                >
                  Planifier un rapport
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExportReport("", "pdf")}
                  disabled={processing}
                >
                  Exporter tous les rapports
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog de création/modification */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          setSelectedReport(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen ? "Créer un rapport" : "Modifier le rapport"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Nom du rapport"
                  value={newReport.name}
                  onChange={(e) =>
                    setNewReport({
                      ...newReport,
                      name: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={newReport.type}
                    onChange={(e) =>
                      setNewReport({
                        ...newReport,
                        type: e.target.value as
                          | "table"
                          | "chart"
                          | "dashboard"
                          | "summary",
                      })
                    }
                  >
                    {reportTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {type.icon}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Catégorie</FormLabel>
                  <Select
                    value={newReport.category}
                    onChange={(e) =>
                      setNewReport({
                        ...newReport,
                        category: e.target.value as
                          | "players"
                          | "teams"
                          | "matches"
                          | "championships"
                          | "financial"
                          | "performance",
                      })
                    }
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Source de données"
                  value={newReport.dataSource}
                  onChange={(e) =>
                    setNewReport({
                      ...newReport,
                      dataSource: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={newReport.description}
                  onChange={(e) =>
                    setNewReport({
                      ...newReport,
                      description: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  label="Requête SQL"
                  multiline
                  rows={4}
                  value={newReport.query}
                  onChange={(e) =>
                    setNewReport({
                      ...newReport,
                      query: e.target.value,
                    })
                  }
                  placeholder="SELECT * FROM players WHERE..."
                />
              </Box>
              {newReport.type === "chart" && (
                <Box sx={{ width: "100%" }}>
                  <Typography variant="h6" gutterBottom>
                    Configuration du graphique
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                      <FormControl fullWidth>
                        <FormLabel>Type de graphique</FormLabel>
                        <Select
                          value={newReport.visualization.chartType}
                          onChange={(e) =>
                            setNewReport({
                              ...newReport,
                              visualization: {
                                ...newReport.visualization,
                                chartType: e.target.value as
                                  | "bar"
                                  | "line"
                                  | "pie"
                                  | "scatter"
                                  | "area",
                              },
                            })
                          }
                        >
                          {chartTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              <Box display="flex" alignItems="center" gap={1}>
                                {type.icon}
                                {type.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={newReport.visualization.showLegend}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) =>
                                setNewReport({
                                  ...newReport,
                                  visualization: {
                                    ...newReport.visualization,
                                    showLegend: e.target.checked,
                                  },
                                })
                              }
                            />
                          }
                          label="Afficher la légende"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={newReport.visualization.showGrid}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) =>
                                setNewReport({
                                  ...newReport,
                                  visualization: {
                                    ...newReport.visualization,
                                    showGrid: e.target.checked,
                                  },
                                })
                              }
                            />
                          }
                          label="Afficher la grille"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={newReport.visualization.showLabels}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) =>
                                setNewReport({
                                  ...newReport,
                                  visualization: {
                                    ...newReport.visualization,
                                    showLabels: e.target.checked,
                                  },
                                })
                              }
                            />
                          }
                          label="Afficher les étiquettes"
                        />
                      </FormGroup>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              setSelectedReport(null);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={createDialogOpen ? handleCreateReport : handleUpdateReport}
            variant="contained"
            startIcon={createDialogOpen ? <AddIcon /> : <EditIcon />}
            disabled={processing || !newReport.name || !newReport.query}
          >
            {processing
              ? "Traitement..."
              : createDialogOpen
              ? "Créer"
              : "Modifier"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog des données */}
      <Dialog
        open={dataDialogOpen}
        onClose={() => setDataDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Données du rapport: {selectedReport?.name}</DialogTitle>
        <DialogContent>
          {reportData && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
                <Box sx={{ width: { xs: "100%", sm: "25%" } }}>
                  <Typography variant="body2" color="text.secondary">
                    Lignes: {reportData.summary.totalRows}
                  </Typography>
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "25%" } }}>
                  <Typography variant="body2" color="text.secondary">
                    Colonnes: {reportData.summary.totalColumns}
                  </Typography>
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "25%" } }}>
                  <Typography variant="body2" color="text.secondary">
                    Temps d&apos;exécution:{" "}
                    {formatDuration(reportData.summary.executionTime)}
                  </Typography>
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "25%" } }}>
                  <Typography variant="body2" color="text.secondary">
                    Généré le: {formatDate(reportData.summary.generatedAt)}
                  </Typography>
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {reportData.columns.map((column, index) => (
                        <TableCell key={index}>{column}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.rows.slice(0, 100).map((row, index) => (
                      <TableRow key={index}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {reportData.rows.length > 100 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Affichage des 100 premières lignes sur{" "}
                  {reportData.summary.totalRows} au total.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDataDialogOpen(false)}>Fermer</Button>
          <Button
            onClick={() =>
              selectedReport && handleExportReport(selectedReport.id, "pdf")
            }
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            Exporter PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de planification */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Planifier le rapport: {selectedReport?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <FormControl fullWidth>
                  <FormLabel>Fréquence</FormLabel>
                  <Select
                    value={newSchedule.frequency}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        frequency: e.target.value as
                          | "daily"
                          | "weekly"
                          | "monthly"
                          | "quarterly",
                      })
                    }
                  >
                    {frequencies.map((freq) => (
                      <MenuItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                <TextField
                  fullWidth
                  label="Heure"
                  type="time"
                  value={newSchedule.time}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      time: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ width: "100%" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newSchedule.enabled}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewSchedule({
                          ...newSchedule,
                          enabled: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Activer la planification"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={() =>
              selectedReport && handleScheduleReport(selectedReport.id)
            }
            variant="contained"
            startIcon={<ScheduleIcon />}
            disabled={processing}
          >
            {processing ? "Planification..." : "Planifier"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
