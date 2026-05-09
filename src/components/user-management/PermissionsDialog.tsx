import { AdminPanelSettings as AdminIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Typography,
} from "@mui/material";
import type { Permission, User } from "./types";

interface PermissionsDialogProps {
  open: boolean;
  processing: boolean;
  selectedUser: User | null;
  permissions: Permission[];
  selectedPermissions: string[];
  onClose: () => void;
  onSelectionChange: (permissions: string[]) => void;
  onSubmit: () => void;
}

export function PermissionsDialog({
  open,
  processing,
  selectedUser,
  permissions,
  selectedPermissions,
  onClose,
  onSelectionChange,
  onSubmit,
}: PermissionsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Permissions de {selectedUser?.firstName} {selectedUser?.lastName}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sélectionnez les permissions à accorder à cet utilisateur.
          </Typography>
          <FormGroup>
            {permissions.map((permission) => (
              <FormControlLabel
                key={permission.id}
                control={
                  <Checkbox
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onSelectionChange([...selectedPermissions, permission.id]);
                      } else {
                        onSelectionChange(
                          selectedPermissions.filter((item) => item !== permission.id)
                        );
                      }
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {permission.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {permission.description}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          startIcon={<AdminIcon />}
          disabled={processing}
        >
          {processing ? "Mise à jour..." : "Mettre à jour"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
