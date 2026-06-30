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
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import BookCover from "@/components/BookCover";
import ProgressRing from "@/components/ProgressRing";
import ScrollReveal from "@/components/ScrollReveal";
import { reorderBooks, type Book } from "@/lib/tauri";
import { bookDisplayTitle } from "@/lib/labels";
import { sortableListModifiers } from "@/lib/dnd";
import { matchesBook, normalizeSearchQuery } from "@/lib/search";

interface BookSortableListProps {
  books: Book[];
  coverCacheKey?: number;
  searchQuery?: string;
  loading?: boolean;
  onBooksChange: (books: Book[]) => void;
  onOpen: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
  onError: (message: string) => void;
}

function SortableBookItem({
  book,
  coverCacheKey,
  index,
  onOpen,
  onEdit,
  onDelete,
}: {
  book: Book;
  coverCacheKey?: number;
  index: number;
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
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{ width: "100%", maxWidth: "100%" }}
    >
      <ScrollReveal index={index} disabled={isDragging}>
        <Card
          variant="outlined"
          sx={{
            width: "100%",
            maxWidth: "100%",
            borderColor: isDragging ? "primary.main" : "divider",
            boxShadow: isDragging ? 4 : 0,
            opacity: isDragging ? 0.85 : 1,
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
          <BookCover
            coverPath={book.cover_path}
            cacheKey={coverCacheKey}
            size="list"
            variant="collection"
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {bookDisplayTitle(book)}
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
      </ScrollReveal>
    </Box>
  );
}

export default function BookSortableList({
  books,
  coverCacheKey,
  searchQuery = "",
  onBooksChange,
  onOpen,
  onEdit,
  onDelete,
  onError,
  loading = false,
}: BookSortableListProps) {
  const [items, setItems] = useState(books);
  const isReorderingRef = useRef(false);
  const normalizedQuery = normalizeSearchQuery(searchQuery);
  const filteredItems = useMemo(
    () => items.filter((book) => matchesBook(book, normalizedQuery)),
    [items, normalizedQuery],
  );
  const isSearching = normalizedQuery.length > 0;

  useLayoutEffect(() => {
    if (isReorderingRef.current) return;
    setItems(books);
  }, [books]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    try {
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
    } finally {
      isReorderingRef.current = false;
    }
  };

  if (loading) {
    return <Box aria-busy="true" sx={{ minHeight: 48 }} />;
  }

  if (books.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center">
        Nenhuma coleção cadastrada. Clique em &quot;Nova coleção&quot; para começar.
      </Typography>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center">
        Nenhuma coleção encontrada para &quot;{searchQuery.trim()}&quot;.
      </Typography>
    );
  }

  if (isSearching) {
    return (
      <Box sx={{ overflow: "hidden", width: "100%", maxWidth: "100%" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {filteredItems.map((book, index) => (
            <SortableBookItem
              key={book.id}
              book={book}
              coverCacheKey={coverCacheKey}
              index={index}
              onOpen={onOpen}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </Box>
      </Box>
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
        onDragStart={() => {
          isReorderingRef.current = true;
        }}
        onDragCancel={() => {
          isReorderingRef.current = false;
        }}
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
            {items.map((book, index) => (
              <SortableBookItem
                key={book.id}
                book={book}
                coverCacheKey={coverCacheKey}
                index={index}
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
