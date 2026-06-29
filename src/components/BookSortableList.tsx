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
import EditIcon from "@mui/icons-material/Edit";
import { useEffect, useRef, useState } from "react";
import BookCover from "@/components/BookCover";
import { reorderBooks, type Book } from "@/lib/tauri";

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
  blockClickRef,
}: {
  book: Book;
  onOpen: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
  blockClickRef: React.MutableRefObject<boolean>;
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
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (blockClickRef.current || isDragging) return;
        onOpen(book);
      }}
      sx={{
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
        border: "1px solid",
        borderColor: isDragging ? "primary.main" : "divider",
        bgcolor: "background.paper",
        opacity: isDragging ? 0.92 : 1,
        boxShadow: isDragging ? 6 : 0,
        transition:
          "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 4,
          bgcolor: "action.hover",
        },
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          py: "24px !important",
          px: "24px !important",
        }}
      >
        <BookCover coverPath={book.cover_path} size="list" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {book.title}
            </Typography>
            <Chip
              size="small"
              label={book.owned ? "Possuo" : "Não possuo"}
              color={book.owned ? "success" : "default"}
              variant="outlined"
            />
          </Stack>
          {book.description && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mt: 1,
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
        <Stack
          direction="row"
          sx={{ flexShrink: 0 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onEdit(book);
            }}
            aria-label="Editar livro"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(book);
            }}
            aria-label="Excluir livro"
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
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
  const blockClickRef = useRef(false);

  useEffect(() => {
    setItems(books);
  }, [books]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = () => {
    blockClickRef.current = true;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      requestAnimationFrame(() => {
        blockClickRef.current = false;
      });
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      blockClickRef.current = false;
      return;
    }

    const reordered = arrayMove(items, oldIndex, newIndex);
    const previous = items;
    setItems(reordered);

    try {
      const updated = await reorderBooks(reordered.map((book) => book.id));
      setItems(updated);
      onBooksChange(updated);
    } catch (e) {
      setItems(previous);
      onError(e instanceof Error ? e.message : "Erro ao reordenar livros.");
    } finally {
      requestAnimationFrame(() => {
        blockClickRef.current = false;
      });
    }
  };

  const handleDragCancel = () => {
    blockClickRef.current = false;
  };

  if (items.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center">
        Nenhum livro cadastrado. Clique em &quot;Novo livro&quot; para começar.
      </Typography>
    );
  }

  return (
    <Box>
      {items.length > 1 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 1.5, display: "block", textAlign: "center" }}
        >
          Arraste o card para reordenar
        </Typography>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {items.map((book) => (
              <SortableBookItem
                key={book.id}
                book={book}
                onOpen={onOpen}
                onEdit={onEdit}
                onDelete={onDelete}
                blockClickRef={blockClickRef}
              />
            ))}
          </Box>
        </SortableContext>
      </DndContext>
    </Box>
  );
}
