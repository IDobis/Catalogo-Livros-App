"use client";

import { useState } from "react";
import {
  AppBar,
  Container,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useColorMode } from "@/providers/ThemeRegistry";
import LibraryView from "@/components/LibraryView";
import BackupDialog from "@/components/BackupPanel";

export default function HomePage() {
  const { mode, toggleColorMode } = useColorMode();
  const [refreshKey, setRefreshKey] = useState(0);
  const [backupOpen, setBackupOpen] = useState(false);

  return (
    <>
      <AppBar position="sticky" elevation={0} color="transparent">
        <Toolbar>
          <MenuBookIcon sx={{ mr: 1.5 }} color="primary" />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Catálogo de Livros
          </Typography>
          <IconButton
            onClick={() => setBackupOpen(true)}
            color="inherit"
            aria-label="Backup"
          >
            <BackupIcon />
          </IconButton>
          <IconButton
            onClick={toggleColorMode}
            color="inherit"
            aria-label="Alternar tema"
          >
            {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <LibraryView key={refreshKey} />
      </Container>

      <BackupDialog
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        onImportComplete={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
