"use client";

import { useState } from "react";
import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAppSettings, type ProgressDisplay, type ScrollAnimation } from "@/providers/AppSettings";
import { useColorMode } from "@/providers/ThemeRegistry";
import BackupDialog from "@/components/BackupPanel";

interface SettingsMenuProps {
  onImportComplete: () => void;
}

export default function SettingsMenu({ onImportComplete }: SettingsMenuProps) {
  const { mode, toggleColorMode } = useColorMode();
  const { progressDisplay, setProgressDisplay, scrollAnimation, setScrollAnimation } =
    useAppSettings();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [backupOpen, setBackupOpen] = useState(false);

  const open = Boolean(anchorEl);

  const handleProgressChange = (
    _event: React.MouseEvent<HTMLElement>,
    value: ProgressDisplay | null,
  ) => {
    if (value) {
      setProgressDisplay(value);
    }
  };

  const handleAnimationChange = (
    _event: React.MouseEvent<HTMLElement>,
    value: ScrollAnimation | null,
  ) => {
    if (value) {
      setScrollAnimation(value);
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="Configurações"
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <SettingsIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 280, mt: 1 } } }}
      >
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            toggleColorMode();
          }}
        >
          <ListItemIcon>
            {mode === "dark" ? (
              <LightModeIcon fontSize="small" />
            ) : (
              <DarkModeIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={mode === "dark" ? "Tema claro" : "Tema escuro"}
            secondary="Alternar aparência"
          />
          <Switch
            edge="end"
            checked={mode === "dark"}
            onChange={toggleColorMode}
            onClick={(e) => e.stopPropagation()}
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setBackupOpen(true);
          }}
        >
          <ListItemIcon>
            <BackupIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Backup" secondary="Exportar ou importar dados" />
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem disabled sx={{ opacity: 1, cursor: "default" }}>
          <Typography variant="subtitle2" color="text.secondary">
            Progressão
          </Typography>
        </MenuItem>

        <MenuItem
          disableRipple
          sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, py: 1.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <ToggleButtonGroup
            value={progressDisplay}
            exclusive
            fullWidth
            size="small"
            onChange={handleProgressChange}
          >
            <ToggleButton value="count">Números (2/5)</ToggleButton>
            <ToggleButton value="percent">Porcentagem (20%)</ToggleButton>
          </ToggleButtonGroup>
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem disabled sx={{ opacity: 1, cursor: "default" }}>
          <Typography variant="subtitle2" color="text.secondary">
            Animação ao abrir
          </Typography>
        </MenuItem>

        <MenuItem
          disableRipple
          sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, py: 1.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <ToggleButtonGroup
            value={scrollAnimation}
            exclusive
            fullWidth
            size="small"
            onChange={handleAnimationChange}
          >
            <ToggleButton value="smooth">Smooth</ToggleButton>
            <ToggleButton value="linear">Linear</ToggleButton>
            <ToggleButton value="none">None</ToggleButton>
          </ToggleButtonGroup>
        </MenuItem>
      </Menu>

      <BackupDialog
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        onImportComplete={onImportComplete}
      />
    </>
  );
}
