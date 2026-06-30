"use client";

import { Box } from "@mui/material";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ArticleIcon from "@mui/icons-material/Article";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { isTauri } from "@/lib/tauri";

interface BookCoverProps {
  coverPath: string | null;
  size?: "small" | "medium" | "large" | "list";
  variant?: "collection" | "chapter" | "item";
  cacheKey?: number;
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
  variant = "collection",
  cacheKey = 0,
}: BookCoverProps) {
  const dimensions = sizes[size];
  const PlaceholderIcon =
    variant === "collection"
      ? CollectionsBookmarkIcon
      : variant === "item"
        ? ArticleIcon
        : MenuBookIcon;
  const [loadError, setLoadError] = useState(false);
  const [pathVersion, setPathVersion] = useState(0);

  useEffect(() => {
    setLoadError(false);
    setPathVersion((version) => version + 1);
  }, [coverPath, cacheKey]);

  if (!coverPath || loadError || !isTauri()) {
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
        <PlaceholderIcon
          color="disabled"
          fontSize={size === "list" || size === "large" ? "large" : "medium"}
        />
      </Box>
    );
  }

  const normalizedPath = coverPath.replace(/\\/g, "/");
  const imageSrc = `${convertFileSrc(normalizedPath)}?v=${cacheKey}-${pathVersion}`;

  return (
    <Box
      component="img"
      key={imageSrc}
      src={imageSrc}
      alt=""
      onError={() => setLoadError(true)}
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
