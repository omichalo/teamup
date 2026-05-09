import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Restore as RestoreIcon,
} from "@mui/icons-material";
import type { Backup } from "./types";
import {
  formatBackupDate,
  formatFileSize,
  getBackupStatusColor,
  getBackupStatusIcon,
  getBackupTypeColor,
  getBackupTypeIcon,
} from "./utils";

interface BackupsTableCardProps {
  backups: Backup[];
  processing: boolean;
  onRestoreBackup: (backup: Backup) => void;
  onDownloadBackup: (backupId: string) => void;
  onDeleteBackup: (backupId: string) => void;
}

export function BackupsTableCard({
  backups,
  processing,
  onRestoreBackup,
  onDownloadBackup,
  onDeleteBackup,
}: BackupsTableCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Sauvegardes disponibles
        </Typography>
        {backups.length === 0 ? (
          <Alert severity="info">Aucune sauvegarde disponible</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Taille</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {backup.name}
                        </Typography>
                        {backup.description && (
                          <Typography variant="caption" color="text.secondary">
                            {backup.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getBackupTypeIcon(backup.type)}
                        <Chip
                          label={backup.type}
                          color={getBackupTypeColor(backup.type)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getBackupStatusIcon(backup.status)}
                        <Chip
                          label={backup.status}
                          color={getBackupStatusColor(backup.status)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatFileSize(backup.size)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatBackupDate(backup.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Restaurer">
                          <IconButton
                            size="small"
                            onClick={() => onRestoreBackup(backup)}
                            disabled={processing || backup.status !== "completed"}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger">
                          <IconButton
                            size="small"
                            onClick={() => onDownloadBackup(backup.id)}
                            disabled={processing || backup.status !== "completed"}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            onClick={() => onDeleteBackup(backup.id)}
                            disabled={processing}
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
  );
}
