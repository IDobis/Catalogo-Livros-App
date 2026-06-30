"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { useCallback, useEffect, useState } from "react";
import {
  exportDatabase,
  getDatabasePath,
  importDatabase,
  isTauri,
} from "@/lib/tauri";

interface BackupDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function BackupDialog({
  open,
  onClose,
  onImportComplete,
}: BackupDialogProps) {
  const [dbPath, setDbPath] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  const [confirmImport, setConfirmImport] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !isTauri()) return;
    getDatabasePath()
      .then(setDbPath)
      .catch(() => setDbPath(""));
  }, [open]);

  const showMessage = useCallback(
    (message: string, severity: "success" | "error") => {
      setSnackbar({ open: true, message, severity });
    },
    [],
  );

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await exportDatabase();
      showMessage(`${result.message} (${result.path})`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao exportar backup.";
      if (!message.includes("cancelada")) {
        showMessage(message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setConfirmImport(false);
    setLoading(true);
    try {
      const result = await importDatabase();
      showMessage(result.message, "success");
      onImportComplete();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao importar backup.";
      if (!message.includes("cancelada")) {
        showMessage(message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Backup</DialogTitle>
        <DialogContent>
          {!isTauri() ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              Backup disponível apenas no aplicativo desktop (Tauri).
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Exporte ou importe o banco SQLite para manter seus dados seguros.
                Antes de importar, um backup automático do estado atual é criado.
              </Typography>
              {dbPath && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 2, wordBreak: "break-all", display: "block" }}
                >
                  Banco local: {dbPath}
                </Typography>
              )}
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  onClick={handleExport}
                  disabled={loading}
                >
                  Exportar
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => setConfirmImport(true)}
                  disabled={loading}
                >
                  Importar
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmImport} onClose={() => setConfirmImport(false)}>
        <DialogTitle>Importar backup?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Isso substituirá todos os dados atuais pelos do arquivo importado.
            Um backup de segurança do estado atual será criado automaticamente
            antes da substituição.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmImport(false)}>Cancelar</Button>
          <Button onClick={handleImport} color="warning" variant="contained">
            Importar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
