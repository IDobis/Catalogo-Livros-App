"use client";

import { Box } from "@mui/material";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useAppSettings } from "@/providers/AppSettings";
import { animationPresets } from "@/lib/scrollAnimation";

interface ScrollRevealProps {
  children: ReactNode;
  index?: number;
  disabled?: boolean;
}

function isInViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < windowHeight * 0.94 && rect.bottom > 0;
}

export default function ScrollReveal({
  children,
  index = 0,
  disabled = false,
}: ScrollRevealProps) {
  const { scrollAnimation } = useAppSettings();
  const ref = useRef<HTMLDivElement>(null);
  const skipAnimation = disabled || scrollAnimation === "none";
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    if (skipAnimation) {
      setVisible(true);
      return;
    }

    setVisible(false);

    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    if (isInViewport(element)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -6% 0px",
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [skipAnimation, scrollAnimation, index]);

  if (scrollAnimation === "none" || disabled) {
    return <Box sx={{ width: "100%", maxWidth: "100%" }}>{children}</Box>;
  }

  const preset = animationPresets[scrollAnimation];
  const delay = Math.min(index * preset.delayStep, preset.maxDelay);
  const transition = `opacity ${preset.duration}s ${preset.easing} ${delay}s, transform ${preset.duration}s ${preset.easing} ${delay}s`;

  return (
    <Box
      ref={ref}
      sx={{
        width: "100%",
        maxWidth: "100%",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${preset.translateY}px)`,
        transition: visible ? transition : "none",
      }}
    >
      {children}
    </Box>
  );
}
