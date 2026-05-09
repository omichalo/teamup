import { Upload as UploadIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

interface UploadBackupDialogProps {
  open: boolean;
  processing: boolean;
  selectedFile: File | null;
  onClose: () => void;
  onSelectFile: (file: File | null) => void;
  onUpload: () => void;
}

export function UploadBackupDialog({
  open,
  processing,
  selectedFile,
  onClose,
  onSelectFile,
  onUpload,
}: UploadBackupDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importer une sauvegarde</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Sélectionnez un fichier de sauvegarde à importer.
          </Alert>
          <TextField
            fullWidth
            type="file"
            inputProps={{ accept: ".backup,.zip,.tar.gz" }}
            onChange={(event) => {
              const file = (event.target as HTMLInputElement).files?.[0] ?? null;
              onSelectFile(file);
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={onUpload}
          variant="contained"
          startIcon={<UploadIcon />}
          disabled={processing || !selectedFile}
        >
          {processing ? "Import..." : "Importer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
