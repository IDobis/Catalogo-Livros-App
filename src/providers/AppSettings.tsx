"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ANIMATION_STORAGE_KEY,
  readStoredScrollAnimation,
  type ScrollAnimation,
} from "@/lib/scrollAnimation";

export type { ScrollAnimation };

export type ProgressDisplay = "count" | "percent";

const PROGRESS_STORAGE_KEY = "catalogo-progress-display";

function readStoredProgressDisplay(): ProgressDisplay {
  if (typeof window === "undefined") return "count";
  const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (stored === "count" || stored === "percent") {
    return stored;
  }
  return "count";
}

interface AppSettingsContextValue {
  progressDisplay: ProgressDisplay;
  setProgressDisplay: (value: ProgressDisplay) => void;
  scrollAnimation: ScrollAnimation;
  setScrollAnimation: (value: ScrollAnimation) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue>({
  progressDisplay: "count",
  setProgressDisplay: () => {},
  scrollAnimation: "smooth",
  setScrollAnimation: () => {},
});

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

export default function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [progressDisplay, setProgressDisplayState] = useState(readStoredProgressDisplay);
  const [scrollAnimation, setScrollAnimationState] = useState(readStoredScrollAnimation);

  const setProgressDisplay = (value: ProgressDisplay) => {
    setProgressDisplayState(value);
    localStorage.setItem(PROGRESS_STORAGE_KEY, value);
  };

  const setScrollAnimation = (value: ScrollAnimation) => {
    setScrollAnimationState(value);
    localStorage.setItem(ANIMATION_STORAGE_KEY, value);
  };

  const value = useMemo(
    () => ({
      progressDisplay,
      setProgressDisplay,
      scrollAnimation,
      setScrollAnimation,
    }),
    [progressDisplay, scrollAnimation],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}
