"use client";

import { Box } from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { convertFileSrc } from "@tauri-apps/api/core";

interface BookCoverProps {
  coverPath: string | null;
  size?: "small" | "medium" | "large" | "list";
}

const sizes = {
  list: { width: 88, height: 126 },
  small: { width: 56, height: 80 },
  medium: { width: 96, height: 136 },
  large: { width: 140, height: 200 },
};

export default function BookCover({
  coverPath,
  size = "small",
}: BookCoverProps) {
  const dimensions = sizes[size];

  if (!coverPath) {
    return (
      <Box
        sx={{
          ...dimensions,
          flexShrink: 0,
          borderRadius: 1.5,
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MenuBookIcon
          color="disabled"
          fontSize={size === "list" || size === "large" ? "large" : "medium"}
        />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={convertFileSrc(coverPath)}
      alt=""
      sx={{
        ...dimensions,
        flexShrink: 0,
        borderRadius: 1.5,
        objectFit: "cover",
        bgcolor: "action.hover",
      }}
    />
  );
}
