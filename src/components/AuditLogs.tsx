"use client";

import { useCallback, useEffect, useState } from "react";
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
  List,
  ListItem,
  ListItemText,
  // ListItemSecondaryAction,
  // IconButton,
  Chip,
  // Divider,
  // Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  // Tooltip,
  Pagination,
  // FormGroup,
  // FormControlLabel,
  // Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from "@mui/material";
import {
  // History as HistoryIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  // Edit as EditIcon,
  // Add as AddIcon,
} from "@mui/icons-material";
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  AUDIT_LEVELS,
} from "@/components/audit-logs/constants";
import type {
  AuditLog,
  AuditLogDetails,
  AuditLogFilters,
  AuditLogsProps,
} from "@/components/audit-logs/types";
import {
  formatAuditDate,
  getCategoryIcon,
  getCategoryLabel,
  getLevelColor,
  getLevelIcon,
  getSeverityColor,
} from "@/components/audit-logs/utils";

export function AuditLogs({
  logs,
  onSearch,
  onExport,
  onClearLogs,
  onGetLogDetails,
  loading = false,
  totalCount = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
}: AuditLogsProps) {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  // const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [logDetails, setLogDetails] = useState<AuditLogDetails | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearDate, setClearDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // const resources = [
  //   "player",
  //   "team",
  //   "match",
  //   "championship",
  //   "availability",
  //   "composition",
  //   "user",
  //   "settings",
  //   "notification",
  //   "audit_log",
  //   "backup",
  //   "report",
  // ];

  const handleSearch = useCallback(async () => {
    try {
      setProcessing(true);
      setError(null);
      await onSearch(filters);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la recherche"
      );
    } finally {
      setProcessing(false);
    }
  }, [filters, onSearch]);

  useEffect(() => {
    handleSearch();
  }, [page, handleSearch]);

  const handleExport = async (format: "csv" | "pdf" | "excel") => {
    try {
      setProcessing(true);
      setError(null);
      await onExport(filters, format);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l&apos;export"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleClearLogs = async () => {
    if (!clearDate) return;

    try {
      setProcessing(true);
      setError(null);
      await onClearLogs(clearDate);
      setClearDialogOpen(false);
      setClearDate("");
      await handleSearch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDetails = async (log: AuditLog) => {
    try {
      setProcessing(true);
      setError(null);
      const details = await onGetLogDetails(log.id);
      // setSelectedLog(log);
      setLogDetails(details);
      setDetailsDialogOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des détails"
      );
    } finally {
      setProcessing(false);
    }
  };

  // const formatDuration = (start: string, end: string) => {
  //   const startTime = new Date(start).getTime();
  //   const endTime = new Date(end).getTime();
  //   const duration = endTime - startTime;

  //   if (duration < 1000) return `${duration}ms`;
  //   if (duration < 60000) return `${Math.round(duration / 1000)}s`;
  //   if (duration < 3600000) return `${Math.round(duration / 60000)}min`;
  //   return `${Math.round(duration / 3600000)}h`;
  // };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Logs d&apos;audit</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleSearch}
            disabled={processing}
          >
            Actualiser
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("csv")}
            disabled={processing}
          >
            CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("pdf")}
            disabled={processing}
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport("excel")}
            disabled={processing}
          >
            Excel
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtres de recherche
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
              <TextField
                fullWidth
                label="Recherche"
                value={filters.search || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    search: e.target.value,
                  })
                }
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                  ),
                }}
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
              <FormControl fullWidth>
                <FormLabel>Niveau</FormLabel>
                <Select
                  multiple
                  value={filters.level || []}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      level: e.target.value as string[],
                    })
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={
                            AUDIT_LEVELS.find((level) => level.value === value)
                              ?.label
                          }
                          color={
                            AUDIT_LEVELS.find(
                              (level) => level.value === value
                            )?.color as
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
                      ))}
                    </Box>
                  )}
                >
                  {AUDIT_LEVELS.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
              <FormControl fullWidth>
                <FormLabel>Catégorie</FormLabel>
                <Select
                  multiple
                  value={filters.category || []}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      category: e.target.value as string[],
                    })
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={getCategoryLabel(value)}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                >
                  {AUDIT_CATEGORIES.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {category.icon}
                        {category.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
              <FormControl fullWidth>
                <FormLabel>Action</FormLabel>
                <Select
                  multiple
                  value={filters.action || []}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      action: e.target.value as string[],
                    })
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {AUDIT_ACTIONS.map((action) => (
                    <MenuItem key={action} value={action}>
                      {action}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
              <TextField
                fullWidth
                label="Date de début"
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateFrom: e.target.value,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
              <TextField
                fullWidth
                label="Date de fin"
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateTo: e.target.value,
                  })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
              <TextField
                fullWidth
                label="Utilisateur"
                value={filters.userId || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    userId: e.target.value,
                  })
                }
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%", md: "25%" } }}>
              <TextField
                fullWidth
                label="Ressource"
                value={filters.resource || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    resource: e.target.value,
                  })
                }
              />
            </Box>
            <Box sx={{ width: "100%" }}>
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  disabled={processing}
                >
                  Rechercher
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => setFilters({})}
                >
                  Effacer les filtres
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setClearDialogOpen(true)}
                >
                  Nettoyer les logs
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Résultats ({totalCount} entrées)
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
          ) : logs.length === 0 ? (
            <Alert severity="info">Aucun log trouvé</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Horodatage</TableCell>
                    <TableCell>Utilisateur</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Ressource</TableCell>
                    <TableCell>Niveau</TableCell>
                    <TableCell>Catégorie</TableCell>
                    <TableCell>Détails</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {formatAuditDate(log.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon fontSize="small" />
                          <Typography variant="body2">
                            {log.userName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getCategoryIcon(log.category)}
                          <Typography variant="body2">
                            {log.resourceName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getLevelIcon(log.level)}
                          <Chip
                            label={log.level}
                            color={
                              getLevelColor(log.level) as
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
                          label={getCategoryLabel(log.category)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<InfoIcon />}
                          onClick={() => handleViewDetails(log)}
                        >
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => onPageChange?.(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog des détails */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Détails du log d&apos;audit</DialogTitle>
        <DialogContent>
          {logDetails && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                <Box sx={{ width: { xs: "100%", md: "50%" } }}>
                  <Typography variant="h6" gutterBottom>
                    Informations générales
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="ID" secondary={logDetails.id} />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Horodatage"
                        secondary={formatAuditDate(logDetails.timestamp)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Utilisateur"
                        secondary={logDetails.userName}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Action"
                        secondary={logDetails.action}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Ressource"
                        secondary={logDetails.resourceName}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Niveau"
                        secondary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {getLevelIcon(logDetails.level)}
                            <Chip
                              label={logDetails.level}
                              color={
                                getLevelColor(logDetails.level) as
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
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Catégorie"
                        secondary={
                          <Box display="flex" alignItems="center" gap={1}>
                            {getCategoryIcon(logDetails.category)}
                            <Chip
                              label={getCategoryLabel(logDetails.category)}
                              size="small"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Adresse IP"
                        secondary={logDetails.ipAddress}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Session"
                        secondary={logDetails.sessionId}
                      />
                    </ListItem>
                  </List>
                </Box>

                <Box sx={{ width: { xs: "100%", md: "50%" } }}>
                  <Typography variant="h6" gutterBottom>
                    Impact et recommandations
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Utilisateurs affectés"
                        secondary={logDetails.impact.affectedUsers}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Ressources affectées"
                        secondary={logDetails.impact.affectedResources}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Sévérité"
                        secondary={
                          <Chip
                            label={logDetails.impact.severity}
                            color={
                              getSeverityColor(logDetails.impact.severity) as
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
                        }
                      />
                    </ListItem>
                  </List>

                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Recommandations
                  </Typography>
                  <List dense>
                    {logDetails.recommendations.map((recommendation, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={recommendation} />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {logDetails.changes && logDetails.changes.length > 0 && (
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="h6" gutterBottom>
                      Modifications
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Champ</TableCell>
                            <TableCell>Ancienne valeur</TableCell>
                            <TableCell>Nouvelle valeur</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {logDetails.changes.map((change, index) => (
                            <TableRow key={index}>
                              <TableCell>{change.field}</TableCell>
                              <TableCell>
                                <Typography variant="body2" color="error">
                                  {JSON.stringify(change.oldValue)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="success">
                                  {JSON.stringify(change.newValue)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                <Box sx={{ width: "100%" }}>
                  <Typography variant="h6" gutterBottom>
                    Détails techniques
                  </Typography>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Métadonnées</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <pre
                        style={{
                          backgroundColor: "#f5f5f5",
                          padding: "16px",
                          borderRadius: "4px",
                          overflow: "auto",
                          fontSize: "12px",
                        }}
                      >
                        {JSON.stringify(logDetails.metadata, null, 2)}
                      </pre>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Détails</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <pre
                        style={{
                          backgroundColor: "#f5f5f5",
                          padding: "16px",
                          borderRadius: "4px",
                          overflow: "auto",
                          fontSize: "12px",
                        }}
                      >
                        {JSON.stringify(logDetails.details, null, 2)}
                      </pre>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de nettoyage */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nettoyer les logs d&apos;audit</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Attention :</strong> Cette action supprimera
              définitivement tous les logs antérieurs à la date sélectionnée.
            </Alert>
            <TextField
              fullWidth
              label="Supprimer les logs antérieurs à"
              type="date"
              value={clearDate}
              onChange={(e) => setClearDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleClearLogs}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={processing || !clearDate}
          >
            {processing ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
