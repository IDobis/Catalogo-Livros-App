"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ProgressDisplay = "count" | "percent";

const STORAGE_KEY = "catalogo-progress-display";

interface AppSettingsContextValue {
  progressDisplay: ProgressDisplay;
  setProgressDisplay: (value: ProgressDisplay) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue>({
  progressDisplay: "count",
  setProgressDisplay: () => {},
});

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

export default function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [progressDisplay, setProgressDisplayState] =
    useState<ProgressDisplay>("count");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "count" || stored === "percent") {
      setProgressDisplayState(stored);
    }
  }, []);

  const setProgressDisplay = (value: ProgressDisplay) => {
    setProgressDisplayState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const value = useMemo(
    () => ({ progressDisplay, setProgressDisplay }),
    [progressDisplay],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}
