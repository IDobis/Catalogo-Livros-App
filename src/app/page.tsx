"use client";

import { useState } from "react";
import {
  AppBar,
  Container,
  Toolbar,
  Typography,
} from "@mui/material";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import LibraryView from "@/components/LibraryView";
import SettingsMenu from "@/components/SettingsMenu";

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <AppBar position="sticky" elevation={0} color="transparent">
        <Toolbar>
          <CollectionsBookmarkIcon sx={{ mr: 1.5 }} color="primary" />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Catálogo de Coleções
          </Typography>
          <SettingsMenu onImportComplete={() => setRefreshKey((k) => k + 1)} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <LibraryView key={refreshKey} />
      </Container>
    </>
  );
}
