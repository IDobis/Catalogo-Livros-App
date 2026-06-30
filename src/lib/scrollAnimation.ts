export type ScrollAnimation = "smooth" | "linear" | "none";

export const ANIMATION_STORAGE_KEY = "catalogo-scroll-animation";

export const animationPresets: Record<
  Exclude<ScrollAnimation, "none">,
  {
    translateY: number;
    duration: number;
    easing: string;
    delayStep: number;
    maxDelay: number;
  }
> = {
  linear: {
    translateY: -20,
    duration: 0.35,
    easing: "linear",
    delayStep: 0.02,
    maxDelay: 0.1,
  },
  smooth: {
    translateY: -32,
    duration: 0.9,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    delayStep: 0.14,
    maxDelay: 0.84,
  },
};

export function readStoredScrollAnimation(): ScrollAnimation {
  if (typeof window === "undefined") return "smooth";
  const stored = localStorage.getItem(ANIMATION_STORAGE_KEY);
  if (stored === "smooth" || stored === "linear" || stored === "none") {
    return stored;
  }
  return "smooth";
}
