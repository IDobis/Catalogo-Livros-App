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
  IconButton,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";
import { useEffect, useState } from "react";
import BookCover from "@/components/BookCover";
import ProgressRing from "@/components/ProgressRing";
import { reorderBooks, type Book } from "@/lib/tauri";
import { sortableListModifiers } from "@/lib/dnd";

interface BookSortableListProps {
  books: Book[];
  onBooksChange: (books: Book[]) => void;
  onOpen: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
  onError: (message: string) => void;
}

function SortableBookItem({
  book,
  onOpen,
  onEdit,
  onDelete,
}: {
  book: Book;
  onOpen: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id });

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
          aria-label="Arrastar coleção"
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon fontSize="small" color="action" />
        </IconButton>
        <Box
          onClick={() => onOpen(book)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            minWidth: 0,
            cursor: "pointer",
          }}
        >
          <BookCover coverPath={book.cover_path} size="list" variant="collection" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {book.title}
            </Typography>
            {book.description && (
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
                {book.description}
              </Typography>
            )}
          </Box>
        </Box>
        <ProgressRing
          ownedCount={book.owned_chapter_count}
          totalCount={book.total_chapter_count}
        />
        <IconButton
          size="small"
          onClick={() => onEdit(book)}
          aria-label="Editar coleção"
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => onDelete(book)}
          aria-label="Excluir coleção"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );
}

export default function BookSortableList({
  books,
  onBooksChange,
  onOpen,
  onEdit,
  onDelete,
  onError,
}: BookSortableListProps) {
  const [items, setItems] = useState(books);

  useEffect(() => {
    setItems(books);
  }, [books]);

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

    const reordered = arrayMove(items, oldIndex, newIndex);
    const previous = items;
    setItems(reordered);

    try {
      const updated = await reorderBooks(reordered.map((book) => book.id));
      setItems(updated);
      onBooksChange(updated);
    } catch (e) {
      setItems(previous);
      onError(e instanceof Error ? e.message : "Erro ao reordenar coleções.");
    }
  };

  if (items.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center">
        Nenhuma coleção cadastrada. Clique em &quot;Nova coleção&quot; para começar.
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
            {items.map((book) => (
              <SortableBookItem
                key={book.id}
                book={book}
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
