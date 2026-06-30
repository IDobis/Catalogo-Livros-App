"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { ReactNode } from "react";
import AppSettingsProvider from "@/providers/AppSettings";
import ThemeRegistry from "@/providers/ThemeRegistry";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui", prepend: true }}>
      <ThemeRegistry>
        <AppSettingsProvider>{children}</AppSettingsProvider>
      </ThemeRegistry>
    </AppRouterCacheProvider>
  );
}
