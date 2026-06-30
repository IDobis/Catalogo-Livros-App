"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";
import { useEffect, useState } from "react";
import BookCover from "@/components/BookCover";
import ProgressRing from "@/components/ProgressRing";
import { chapterDisplayName } from "@/lib/labels";
import { sortableListModifiers } from "@/lib/dnd";
import { reorderChapters, type Chapter } from "@/lib/tauri";

interface ChapterSortableListProps {
  bookId: number;
  chapters: Chapter[];
  onChaptersChange: (chapters: Chapter[]) => void;
  onOpen: (chapter: Chapter) => void;
  onEdit: (chapter: Chapter) => void;
  onDelete: (chapter: Chapter) => void;
  onError: (message: string) => void;
}

function SortableChapterItem({
  chapter,
  onOpen,
  onEdit,
  onDelete,
}: {
  chapter: Chapter;
  onOpen: (chapter: Chapter) => void;
  onEdit: (chapter: Chapter) => void;
  onDelete: (chapter: Chapter) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, x: 0 } : null,
    ),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        width: "100%",
        maxWidth: "100%",
        borderColor: isDragging ? "primary.main" : "divider",
        boxShadow: isDragging ? 4 : 0,
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          py: "14px !important",
          px: "16px !important",
        }}
      >
        <IconButton
          size="small"
          sx={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
          aria-label="Arrastar capítulo"
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon fontSize="small" color="action" />
        </IconButton>
        <Box
          onClick={() => onOpen(chapter)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            minWidth: 0,
            cursor: "pointer",
          }}
        >
          <BookCover coverPath={chapter.cover_path} size="small" variant="chapter" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {chapterDisplayName(chapter)}
              </Typography>
              <Chip
                size="small"
                label={chapter.owned ? "Possuo" : "Não possuo"}
                color={chapter.owned ? "success" : "default"}
                variant="outlined"
              />
            </Stack>
            {chapter.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {chapter.description}
              </Typography>
            )}
          </Box>
        </Box>
        <ProgressRing
          ownedCount={chapter.owned_item_count}
          totalCount={chapter.total_item_count}
        />
        <IconButton
          size="small"
          onClick={() => onEdit(chapter)}
          aria-label="Editar capítulo"
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => onDelete(chapter)}
          aria-label="Excluir capítulo"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );
}

export default function ChapterSortableList({
  bookId,
  chapters,
  onChaptersChange,
  onOpen,
  onEdit,
  onDelete,
  onError,
}: ChapterSortableListProps) {
  const [items, setItems] = useState(chapters);

  useEffect(() => {
    setItems(chapters);
  }, [chapters]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex).map(
      (chapter, index) => ({
        ...chapter,
        chapter_number: index + 1,
      }),
    );

    const previous = items;
    setItems(reordered);

    try {
      const updated = await reorderChapters(
        bookId,
        reordered.map((chapter) => chapter.id),
      );
      setItems(updated);
      onChaptersChange(updated);
    } catch (e) {
      setItems(previous);
      onError(e instanceof Error ? e.message : "Erro ao reordenar capítulos.");
    }
  };

  if (items.length === 0) {
    return (
      <Typography color="text.secondary">
        Nenhum capítulo cadastrado.
      </Typography>
    );
  }

  return (
    <Box sx={{ overflow: "hidden", width: "100%", maxWidth: "100%" }}>
      {items.length > 1 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 1, display: "block" }}
        >
          Arraste para reordenar
        </Typography>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={sortableListModifiers}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              width: "100%",
              maxWidth: "100%",
            }}
          >
            {items.map((chapter) => (
              <SortableChapterItem
                key={chapter.id}
                chapter={chapter}
                onOpen={onOpen}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </Box>
        </SortableContext>
      </DndContext>
    </Box>
  );
}
