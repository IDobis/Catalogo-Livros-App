"use client";

import { createTheme, PaletteMode } from "@mui/material/styles";

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      ...(mode === "dark"
        ? {
            primary: { main: "#90caf9" },
            background: {
              default: "#121212",
              paper: "#1e1e1e",
            },
            text: {
              primary: "#e8e8e8",
              secondary: "#9e9e9e",
            },
            divider: "rgba(255, 255, 255, 0.08)",
          }
        : {
            primary: { main: "#1976d2" },
            background: {
              default: "#f5f5f5",
              paper: "#ffffff",
            },
          }),
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 500 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: "thin",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 500 },
        },
      },
    },
  });
}
