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
import { useEffect, useMemo, useState } from "react";
import BookCover from "@/components/BookCover";
import { itemDisplayName } from "@/lib/labels";
import { sortableListModifiers } from "@/lib/dnd";
import { matchesItem, normalizeSearchQuery } from "@/lib/search";
import { reorderItems, type Item } from "@/lib/tauri";

interface ItemSortableListProps {
  chapterId: number;
  items: Item[];
  coverCacheKey?: number;
  searchQuery?: string;
  onItemsChange: (items: Item[]) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onError: (message: string) => void;
}

function SortableItemRow({
  item,
  coverCacheKey,
  onEdit,
  onDelete,
}: {
  item: Item;
  coverCacheKey?: number;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

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
          aria-label="Arrastar item"
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon fontSize="small" color="action" />
        </IconButton>
        <BookCover
          coverPath={item.cover_path}
          cacheKey={coverCacheKey}
          size="small"
          variant="item"
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {itemDisplayName(item)}
            </Typography>
            <Chip
              size="small"
              label={item.owned ? "Possuo" : "Não possuo"}
              color={item.owned ? "success" : "default"}
              variant="outlined"
            />
          </Stack>
          {item.description && (
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
              {item.description}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={() => onEdit(item)}
          aria-label="Editar item"
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => onDelete(item)}
          aria-label="Excluir item"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );
}

export default function ItemSortableList({
  chapterId,
  items,
  coverCacheKey,
  searchQuery = "",
  onItemsChange,
  onEdit,
  onDelete,
  onError,
}: ItemSortableListProps) {
  const [listItems, setListItems] = useState(items);
  const normalizedQuery = normalizeSearchQuery(searchQuery);
  const filteredItems = useMemo(
    () => listItems.filter((item) => matchesItem(item, normalizedQuery)),
    [listItems, normalizedQuery],
  );
  const isSearching = normalizedQuery.length > 0;

  useEffect(() => {
    setListItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = listItems.findIndex((item) => item.id === active.id);
    const newIndex = listItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(listItems, oldIndex, newIndex).map(
      (item, index) => ({
        ...item,
        item_number: index + 1,
      }),
    );

    const previous = listItems;
    setListItems(reordered);

    try {
      const updated = await reorderItems(
        chapterId,
        reordered.map((item) => item.id),
      );
      setListItems(updated);
      onItemsChange(updated);
    } catch (e) {
      setListItems(previous);
      onError(e instanceof Error ? e.message : "Erro ao reordenar itens.");
    }
  };

  if (listItems.length === 0) {
    return (
      <Typography color="text.secondary">
        Nenhum item cadastrado.
      </Typography>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <Typography color="text.secondary">
        Nenhum item encontrado para &quot;{searchQuery.trim()}&quot;.
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
          {filteredItems.map((item) => (
            <SortableItemRow
              key={item.id}
              item={item}
              coverCacheKey={coverCacheKey}
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
      {listItems.length > 1 && (
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
          items={listItems.map((item) => item.id)}
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
            {listItems.map((item) => (
              <SortableItemRow
                key={item.id}
                item={item}
                coverCacheKey={coverCacheKey}
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
