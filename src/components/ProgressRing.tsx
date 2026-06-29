"use client";

import { Box, CircularProgress, Typography } from "@mui/material";
import { useAppSettings } from "@/providers/AppSettings";

interface ProgressRingProps {
  ownedCount: number;
  totalCount: number;
  size?: number;
}

export default function ProgressRing({
  ownedCount,
  totalCount,
  size = 52,
}: ProgressRingProps) {
  const { progressDisplay } = useAppSettings();
  const percent =
    totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
  const label =
    progressDisplay === "count"
      ? `${ownedCount}/${totalCount}`
      : `${percent}%`;

  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        flexShrink: 0,
      }}
    >
      <CircularProgress
        variant="determinate"
        value={percent}
        size={size}
        thickness={4}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="caption" component="div" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
