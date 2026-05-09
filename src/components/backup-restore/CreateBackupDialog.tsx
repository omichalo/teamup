import {
  Backup as BackupIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material";
import { BACKUP_DATA_TYPES } from "./constants";
import type { BackupOptions } from "./types";

interface CreateBackupDialogProps {
  open: boolean;
  backup: BackupOptions;
  processing: boolean;
  onClose: () => void;
  onBackupChange: (backup: BackupOptions) => void;
  onCreate: () => void;
}

export function CreateBackupDialog({
  open,
  backup,
  processing,
  onClose,
  onBackupChange,
  onCreate,
}: CreateBackupDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Créer une sauvegarde</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
              <TextField
                fullWidth
                label="Nom de la sauvegarde"
                value={backup.name}
                onChange={(event) =>
                  onBackupChange({
                    ...backup,
                    name: event.target.value,
                  })
                }
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
              <FormControl fullWidth>
                <FormLabel>Type</FormLabel>
                <Select
                  value={backup.type}
                  onChange={(event) =>
                    onBackupChange({
                      ...backup,
                      type: event.target.value as BackupOptions["type"],
                    })
                  }
                >
                  <MenuItem value="full">Complète</MenuItem>
                  <MenuItem value="incremental">Incrémentale</MenuItem>
                  <MenuItem value="differential">Différentielle</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: "100%" }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={backup.description}
                onChange={(event) =>
                  onBackupChange({
                    ...backup,
                    description: event.target.value,
                  })
                }
              />
            </Box>
            <Box sx={{ width: "100%" }}>
              <FormControl fullWidth>
                <FormLabel>Types de données</FormLabel>
                <Select
                  multiple
                  value={backup.dataTypes}
                  onChange={(event) =>
                    onBackupChange({
                      ...backup,
                      dataTypes: event.target.value as string[],
                    })
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={
                            BACKUP_DATA_TYPES.find((dataType) => dataType.value === value)
                              ?.label ?? value
                          }
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                >
                  {BACKUP_DATA_TYPES.map((dataType) => (
                    <MenuItem key={dataType.value} value={dataType.value}>
                      {dataType.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={backup.compression}
                    onChange={(event) =>
                      onBackupChange({
                        ...backup,
                        compression: event.target.checked,
                      })
                    }
                  />
                }
                label="Compression"
              />
            </Box>
            <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={backup.encryption}
                    onChange={(event) =>
                      onBackupChange({
                        ...backup,
                        encryption: event.target.checked,
                      })
                    }
                  />
                }
                label="Chiffrement"
              />
            </Box>
            {backup.encryption && (
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  label="Mot de passe"
                  type="password"
                  value={backup.password ?? ""}
                  onChange={(event) =>
                    onBackupChange({
                      ...backup,
                      password: event.target.value,
                    })
                  }
                />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={onCreate}
          variant="contained"
          startIcon={<BackupIcon />}
          disabled={processing || !backup.name}
        >
          {processing ? "Création..." : "Créer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
