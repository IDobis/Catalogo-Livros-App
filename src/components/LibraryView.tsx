"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import { useCallback, useEffect, useRef, useState } from "react";
import BookCover from "@/components/BookCover";
import BookSortableList from "@/components/BookSortableList";
import ChapterSortableList from "@/components/ChapterSortableList";
import ConfirmDialog from "@/components/ConfirmDialog";
import ItemSortableList from "@/components/ItemSortableList";
import SearchField from "@/components/SearchField";
import { chapterDisplayName, itemDisplayName, bookDisplayTitle } from "@/lib/labels";
import {
  DESCRIPTION_MAX,
  TITLE_LONG_MAX,
  descriptionHelperText,
  displayTitle,
  titleHelperText,
  validateDescription,
  validateTitle,
} from "@/lib/fieldLimits";
import {
  deleteBook,
  deleteChapter,
  deleteItem,
  listBooks,
  listChapters,
  listItems,
  pickImageFile,
  removeBookCover,
  removeChapterCover,
  removeItemCover,
  saveBook,
  saveChapter,
  saveItem,
  setBookCover,
  setBookCoverFromPath,
  setChapterCover,
  setChapterCoverFromPath,
  setItemCover,
  setItemCoverFromPath,
  updateBook,
  updateChapter,
  updateItem,
  type Book,
  type Chapter,
  type Item,
} from "@/lib/tauri";

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
}

interface BookFormState {
  title: string;
  description: string;
}

interface ChapterFormState {
  title: string;
  description: string;
  owned: boolean;
}

interface ItemFormState {
  title: string;
  description: string;
  owned: boolean;
}

const emptyBookForm: BookFormState = { title: "", description: "" };
const emptyChapterForm: ChapterFormState = { title: "", description: "", owned: false };
const emptyItemForm: ItemFormState = { title: "", description: "", owned: false };

export default function LibraryView() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [chapterFormOpen, setChapterFormOpen] = useState(false);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<BookFormState>(emptyBookForm);
  const [chapterEditForm, setChapterEditForm] = useState<ChapterFormState>(emptyChapterForm);
  const [itemEditForm, setItemEditForm] = useState<ItemFormState>(emptyItemForm);
  const [pendingBookCoverPath, setPendingBookCoverPath] = useState<string | null>(null);
  const [pendingChapterCoverPath, setPendingChapterCoverPath] = useState<string | null>(null);
  const [pendingItemCoverPath, setPendingItemCoverPath] = useState<string | null>(null);
  const [coverCacheEpoch, setCoverCacheEpoch] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookTitleError, setBookTitleError] = useState<string | null>(null);
  const [bookDescriptionError, setBookDescriptionError] = useState<string | null>(null);
  const [chapterTitleError, setChapterTitleError] = useState<string | null>(null);
  const [chapterDescriptionError, setChapterDescriptionError] = useState<string | null>(null);
  const [itemTitleError, setItemTitleError] = useState<string | null>(null);
  const [itemDescriptionError, setItemDescriptionError] = useState<string | null>(null);
  const [booksLoading, setBooksLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirmar",
  });
  const pendingConfirmRef = useRef<(() => Promise<void>) | null>(null);

  const bumpCoverCache = () => {
    setCoverCacheEpoch((epoch) => epoch + 1);
  };

  const openConfirm = (
    title: string,
    message: string,
    action: () => Promise<void>,
    confirmLabel = "Confirmar",
  ) => {
    pendingConfirmRef.current = action;
    setConfirmDialog({ open: true, title, message, confirmLabel });
  };

  const closeConfirm = () => {
    pendingConfirmRef.current = null;
    setConfirmDialog((current) => ({ ...current, open: false }));
  };

  const handleConfirmAction = async () => {
    const action = pendingConfirmRef.current;
    closeConfirm();
    if (action) {
      await action();
    }
  };

  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const data = await listBooks();
      setBooks(data);
      setSelectedBook((current) => {
        if (!current) return null;
        return data.find((b) => b.id === current.id) ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar coleções.");
    } finally {
      setBooksLoading(false);
    }
  }, []);

  const loadChapters = useCallback(async (bookId: number) => {
    setChaptersLoading(true);
    try {
      const data = await listChapters(bookId);
      setChapters(data);
      setSelectedChapter((current) => {
        if (!current) return null;
        return data.find((c) => c.id === current.id) ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar capítulos.");
    } finally {
      setChaptersLoading(false);
    }
  }, []);

  const loadItems = useCallback(async (chapterId: number) => {
    setItemsLoading(true);
    try {
      const data = await listItems(chapterId);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar itens.");
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    if (selectedBook) {
      loadChapters(selectedBook.id);
    } else {
      setChapters([]);
      setSelectedChapter(null);
    }
  }, [selectedBook, loadChapters]);

  useEffect(() => {
    if (selectedChapter) {
      loadItems(selectedChapter.id);
    } else {
      setItems([]);
    }
  }, [selectedChapter, loadItems]);

  const openCreateForm = () => {
    setEditingBook(null);
    setForm(emptyBookForm);
    setPendingBookCoverPath(null);
    setBookTitleError(null);
    setBookDescriptionError(null);
    setFormOpen(true);
  };

  const openEditForm = (book: Book) => {
    setEditingBook(book);
    setForm({
      title: bookDisplayTitle(book),
      description: book.description ?? "",
    });
    setPendingBookCoverPath(null);
    setBookTitleError(null);
    setBookDescriptionError(null);
    setFormOpen(true);
  };

  const openEditItemForm = (item: Item) => {
    setEditingItem(item);
    setItemEditForm({
      title: displayTitle(item.item_title, item.long_titulo),
      description: item.description ?? "",
      owned: item.owned,
    });
    setPendingItemCoverPath(null);
    setItemTitleError(null);
    setItemDescriptionError(null);
    setItemFormOpen(true);
  };

  const openCreateItemForm = () => {
    setEditingItem(null);
    setItemEditForm(emptyItemForm);
    setPendingItemCoverPath(null);
    setItemTitleError(null);
    setItemDescriptionError(null);
    setItemFormOpen(true);
  };

  const handleSaveItem = async () => {
    if (!selectedChapter || !selectedBook) return;

    const titleError = validateTitle(itemEditForm.title, false);
    const descriptionError = validateDescription(itemEditForm.description);
    setItemTitleError(titleError);
    setItemDescriptionError(descriptionError);
    if (titleError || descriptionError) {
      return;
    }

    try {
      if (editingItem) {
        await updateItem(
          editingItem.id,
          itemEditForm.title.trim() || null,
          itemEditForm.description.trim() || null,
          itemEditForm.owned,
        );
      } else {
        let created = await saveItem(
          selectedChapter.id,
          itemEditForm.title.trim() || null,
          itemEditForm.description.trim() || null,
          itemEditForm.owned,
        );
        if (pendingItemCoverPath) {
          created = await setItemCoverFromPath(created.id, pendingItemCoverPath);
          bumpCoverCache();
        }
      }
      setPendingItemCoverPath(null);
      setItemFormOpen(false);
      setEditingItem(null);
      await loadItems(selectedChapter.id);
      await loadChapters(selectedBook.id);
      await loadBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar item.");
    }
  };

  const handlePickItemCover = async () => {
    try {
      if (editingItem) {
        await handleSetItemCover(editingItem.id);
        return;
      }
      const path = await pickImageFile("Escolher imagem do item");
      setPendingItemCoverPath(path);
      bumpCoverCache();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao definir imagem.";
      if (!message.includes("cancelada")) {
        setError(message);
      }
    }
  };

  const handleClearItemCover = () => {
    if (editingItem) {
      handleRemoveItemCover(editingItem.id);
      return;
    }
    setPendingItemCoverPath(null);
    bumpCoverCache();
  };

  const handleSetItemCover = async (itemId: number) => {
    if (!selectedChapter) return;
    try {
      const updated = await setItemCover(itemId);
      bumpCoverCache();
      await loadItems(selectedChapter.id);
      if (editingItem?.id === itemId) {
        setEditingItem(updated);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao definir imagem.";
      if (!message.includes("cancelada")) {
        setError(message);
      }
    }
  };

  const handleRemoveItemCover = (itemId: number) => {
    if (!selectedChapter) return;
    openConfirm(
      "Remover imagem?",
      "Tem certeza que deseja remover a imagem deste item?",
      async () => {
        try {
          const updated = await removeItemCover(itemId);
          bumpCoverCache();
          await loadItems(selectedChapter.id);
          if (editingItem?.id === itemId) {
            setEditingItem(updated);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao remover imagem.");
        }
      },
      "Remover",
    );
  };

  const openEditChapterForm = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterEditForm({
      title: displayTitle(chapter.chapter_title, chapter.long_titulo),
      description: chapter.description ?? "",
      owned: chapter.owned,
    });
    setPendingChapterCoverPath(null);
    setChapterTitleError(null);
    setChapterDescriptionError(null);
    setChapterFormOpen(true);
  };

  const openCreateChapterForm = () => {
    setEditingChapter(null);
    setChapterEditForm(emptyChapterForm);
    setPendingChapterCoverPath(null);
    setChapterTitleError(null);
    setChapterDescriptionError(null);
    setChapterFormOpen(true);
  };

  const handleSaveChapter = async () => {
    if (!selectedBook) return;

    const titleError = validateTitle(chapterEditForm.title, false);
    const descriptionError = validateDescription(chapterEditForm.description);
    setChapterTitleError(titleError);
    setChapterDescriptionError(descriptionError);
    if (titleError || descriptionError) {
      return;
    }

    try {
      if (editingChapter) {
        const updated = await updateChapter(
          editingChapter.id,
          chapterEditForm.title.trim() || null,
          chapterEditForm.description.trim() || null,
          chapterEditForm.owned,
        );
        if (selectedChapter?.id === updated.id) {
          setSelectedChapter(updated);
        }
      } else {
        let created = await saveChapter(
          selectedBook.id,
          chapterEditForm.title.trim() || null,
          chapterEditForm.description.trim() || null,
          chapterEditForm.owned,
        );
        if (pendingChapterCoverPath) {
          created = await setChapterCoverFromPath(
            created.id,
            pendingChapterCoverPath,
          );
          bumpCoverCache();
        }
      }
      setPendingChapterCoverPath(null);
      setChapterFormOpen(false);
      setEditingChapter(null);
      await loadChapters(selectedBook.id);
      await loadBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar capítulo.");
    }
  };

  const handlePickChapterCover = async () => {
    try {
      if (editingChapter) {
        await handleSetChapterCover(editingChapter.id);
        return;
      }
      const path = await pickImageFile("Escolher imagem do capítulo");
      setPendingChapterCoverPath(path);
      bumpCoverCache();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao definir imagem.";
      if (!message.includes("cancelada")) {
        setError(message);
      }
    }
  };

  const handleClearChapterCover = () => {
    if (editingChapter) {
      handleRemoveChapterCover(editingChapter.id);
      return;
    }
    setPendingChapterCoverPath(null);
    bumpCoverCache();
  };

  const handleSetChapterCover = async (chapterId: number) => {
    if (!selectedBook) return;
    try {
      const updated = await setChapterCover(chapterId);
      bumpCoverCache();
      await loadChapters(selectedBook.id);
      if (editingChapter?.id === chapterId) {
        setEditingChapter(updated);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao definir imagem.";
      if (!message.includes("cancelada")) {
        setError(message);
      }
    }
  };

  const handleRemoveChapterCover = (chapterId: number) => {
    if (!selectedBook) return;
    openConfirm(
      "Remover imagem?",
      "Tem certeza que deseja remover a imagem deste capítulo?",
      async () => {
        try {
          const updated = await removeChapterCover(chapterId);
          bumpCoverCache();
          await loadChapters(selectedBook.id);
          if (editingChapter?.id === chapterId) {
            setEditingChapter(updated);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao remover imagem.");
        }
      },
      "Remover",
    );
  };

  const handleSaveBook = async () => {
    const titleError = validateTitle(
      form.title,
      true,
      "O título da coleção é obrigatório.",
    );
    const descriptionError = validateDescription(form.description);
    setBookTitleError(titleError);
    setBookDescriptionError(descriptionError);
    if (titleError || descriptionError) {
      return;
    }

    const title = form.title.trim();
    setBookTitleError(null);
    setBookDescriptionError(null);
    try {
      const description = form.description.trim() || null;
      if (editingBook) {
        await updateBook(
          editingBook.id,
          title,
          description,
          editingBook.owned,
        );
      } else {
        let created = await saveBook(title, description, false);
        if (pendingBookCoverPath) {
          created = await setBookCoverFromPath(created.id, pendingBookCoverPath);
          bumpCoverCache();
        }
      }
      setPendingBookCoverPath(null);
      setFormOpen(false);
      await loadBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar coleção.");
    }
  };

  const handlePickBookCover = async () => {
    try {
      if (editingBook) {
        await handleSetCover(editingBook.id);
        return;
      }
      const path = await pickImageFile("Escolher capa da coleção");
      setPendingBookCoverPath(path);
      bumpCoverCache();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao definir capa.";
      if (!message.includes("cancelada")) {
        setError(message);
      }
    }
  };

  const handleClearBookCover = () => {
    if (editingBook) {
      handleRemoveCover(editingBook.id);
      return;
    }
    setPendingBookCoverPath(null);
    bumpCoverCache();
  };

  const handleDeleteBook = (book: Book) => {
    openConfirm(
      "Excluir coleção?",
      `Tem certeza que deseja excluir a coleção "${bookDisplayTitle(book)}"? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await deleteBook(book.id);
          if (selectedBook?.id === book.id) {
            setSelectedBook(null);
          }
          await loadBooks();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao excluir coleção.");
        }
      },
      "Excluir",
    );
  };

  const handleSetCover = async (bookId: number) => {
    try {
      const updated = await setBookCover(bookId);
      bumpCoverCache();
      await loadBooks();
      if (selectedBook?.id === bookId) {
        setSelectedBook(updated);
      }
      if (editingBook?.id === bookId) {
        setEditingBook(updated);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao definir capa.";
      if (!message.includes("cancelada")) {
        setError(message);
      }
    }
  };

  const handleRemoveCover = (bookId: number) => {
    openConfirm(
      "Remover imagem?",
      "Tem certeza que deseja remover a capa desta coleção?",
      async () => {
        try {
          const updated = await removeBookCover(bookId);
          bumpCoverCache();
          await loadBooks();
          if (selectedBook?.id === bookId) {
            setSelectedBook(updated);
          }
          if (editingBook?.id === bookId) {
            setEditingBook(updated);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao remover capa.");
        }
      },
      "Remover",
    );
  };

  const handleOpenBook = (book: Book) => {
    setSearchQuery("");
    setSelectedBook(book);
    setSelectedChapter(null);
    setError(null);
  };

  const handleOpenChapter = (chapter: Chapter) => {
    setSearchQuery("");
    setSelectedChapter(chapter);
    setError(null);
  };

  const handleBack = () => {
    setSearchQuery("");
    if (selectedChapter) {
      setSelectedChapter(null);
      setError(null);
      return;
    }
    setSelectedBook(null);
    setError(null);
    void loadBooks();
  };

  const handleDeleteChapter = (chapter: Chapter) => {
    const title = chapterDisplayName(chapter);
    openConfirm(
      "Excluir capítulo?",
      `Tem certeza que deseja excluir o capítulo "${title}"? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await deleteChapter(chapter.id);
          if (selectedChapter?.id === chapter.id) {
            setSelectedChapter(null);
          }
          if (selectedBook) {
            await loadChapters(selectedBook.id);
            await loadBooks();
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao excluir capítulo.");
        }
      },
      "Excluir",
    );
  };

  const handleDeleteItem = (item: Item) => {
    const title = itemDisplayName(item);
    openConfirm(
      "Excluir item?",
      `Tem certeza que deseja excluir o item "${title}"? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await deleteItem(item.id);
          if (selectedChapter) {
            await loadItems(selectedChapter.id);
            if (selectedBook) {
              await loadChapters(selectedBook.id);
              await loadBooks();
            }
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao excluir item.");
        }
      },
      "Excluir",
    );
  };

  return (
    <Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!selectedBook ? (
        <Box sx={{ maxWidth: 720, mx: "auto", width: "100%", overflow: "hidden" }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              mb: 3,
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ flexShrink: 0 }}>
              Coleções
            </Typography>
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Pesquisar coleções..."
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateForm}
              sx={{ flexShrink: 0 }}
            >
              Nova coleção
            </Button>
          </Stack>

          <BookSortableList
            books={books}
            coverCacheKey={coverCacheEpoch}
            searchQuery={searchQuery}
            loading={booksLoading}
            onBooksChange={setBooks}
            onOpen={handleOpenBook}
            onEdit={openEditForm}
            onDelete={handleDeleteBook}
            onError={setError}
          />
        </Box>
      ) : selectedChapter ? (
        <Box sx={{ maxWidth: 640, mx: "auto", width: "100%", overflow: "hidden" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "flex-start" }}>
            <IconButton onClick={handleBack} aria-label="Voltar" sx={{ mt: 0.5 }}>
              <ArrowBackIcon />
            </IconButton>
            <BookCover
              coverPath={selectedChapter.cover_path}
              cacheKey={coverCacheEpoch}
              size="medium"
              variant="chapter"
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6">
                {chapterDisplayName(selectedChapter)}
              </Typography>
              {selectedChapter.description?.trim() && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                >
                  {selectedChapter.description}
                </Typography>
              )}
            </Box>
            <IconButton onClick={() => openEditChapterForm(selectedChapter)} sx={{ mt: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            sx={{
              mb: 2,
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" sx={{ flexShrink: 0 }}>
              Itens
            </Typography>
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Pesquisar itens..."
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={openCreateItemForm}
              sx={{ flexShrink: 0 }}
            >
              Novo item
            </Button>
          </Stack>

          <ItemSortableList
            chapterId={selectedChapter.id}
            coverCacheKey={coverCacheEpoch}
            searchQuery={searchQuery}
            items={items}
            loading={itemsLoading}
            onItemsChange={setItems}
            onEdit={openEditItemForm}
            onDelete={handleDeleteItem}
            onError={setError}
          />
        </Box>
      ) : (
        <Box sx={{ maxWidth: 640, mx: "auto", width: "100%", overflow: "hidden" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "flex-start" }}>
            <IconButton onClick={handleBack} aria-label="Voltar" sx={{ mt: 0.5 }}>
              <ArrowBackIcon />
            </IconButton>
            <BookCover
              coverPath={selectedBook.cover_path}
              cacheKey={coverCacheEpoch}
              size="medium"
              variant="collection"
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6">
                {bookDisplayTitle(selectedBook)}
              </Typography>
              {selectedBook.description?.trim() && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                >
                  {selectedBook.description}
                </Typography>
              )}
            </Box>
            <IconButton onClick={() => openEditForm(selectedBook)} sx={{ mt: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            sx={{
              mb: 2,
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" sx={{ flexShrink: 0 }}>
              Capítulos
            </Typography>
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Pesquisar capítulos..."
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={openCreateChapterForm}
              sx={{ flexShrink: 0 }}
            >
              Novo capítulo
            </Button>
          </Stack>

          <ChapterSortableList
            bookId={selectedBook.id}
            coverCacheKey={coverCacheEpoch}
            searchQuery={searchQuery}
            chapters={chapters}
            loading={chaptersLoading}
            onChaptersChange={setChapters}
            onOpen={handleOpenChapter}
            onEdit={openEditChapterForm}
            onDelete={handleDeleteChapter}
            onError={setError}
          />
        </Box>
      )}

      <Dialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setPendingBookCoverPath(null);
          setBookTitleError(null);
          setBookDescriptionError(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingBook ? "Editar coleção" : "Nova coleção"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack spacing={1.5} alignItems="center">
              <BookCover
                coverPath={editingBook?.cover_path ?? pendingBookCoverPath}
                cacheKey={coverCacheEpoch}
                size="large"
                variant="collection"
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ImageIcon />}
                  onClick={() => void handlePickBookCover()}
                >
                  Escolher capa
                </Button>
                {(editingBook?.cover_path ?? pendingBookCoverPath) && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleClearBookCover}
                  >
                    Remover
                  </Button>
                )}
              </Stack>
            </Stack>
            <TextField
              label="Título"
              value={form.title}
              onChange={(e) => {
                const value = e.target.value.slice(0, TITLE_LONG_MAX);
                setForm((f) => ({ ...f, title: value }));
                if (bookTitleError) {
                  setBookTitleError(null);
                }
              }}
              required
              error={Boolean(bookTitleError)}
              helperText={bookTitleError ?? titleHelperText(form.title)}
              inputProps={{ maxLength: TITLE_LONG_MAX }}
              fullWidth
              autoFocus={!editingBook}
            />
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(e) => {
                const value = e.target.value.slice(0, DESCRIPTION_MAX);
                setForm((f) => ({ ...f, description: value }));
                if (bookDescriptionError) {
                  setBookDescriptionError(null);
                }
              }}
              error={Boolean(bookDescriptionError)}
              helperText={bookDescriptionError ?? descriptionHelperText(form.description)}
              inputProps={{ maxLength: DESCRIPTION_MAX }}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveBook}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={chapterFormOpen}
        onClose={() => {
          setChapterFormOpen(false);
          setEditingChapter(null);
          setPendingChapterCoverPath(null);
          setChapterTitleError(null);
          setChapterDescriptionError(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingChapter ? "Editar capítulo" : "Novo capítulo"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack spacing={1.5} alignItems="center">
              <BookCover
                coverPath={editingChapter?.cover_path ?? pendingChapterCoverPath}
                cacheKey={coverCacheEpoch}
                size="large"
                variant="chapter"
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ImageIcon />}
                  onClick={() => void handlePickChapterCover()}
                >
                  Escolher imagem
                </Button>
                {(editingChapter?.cover_path ?? pendingChapterCoverPath) && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleClearChapterCover}
                  >
                    Remover
                  </Button>
                )}
              </Stack>
            </Stack>
            <TextField
              label="Título"
              value={chapterEditForm.title}
              onChange={(e) => {
                const value = e.target.value.slice(0, TITLE_LONG_MAX);
                setChapterEditForm((f) => ({ ...f, title: value }));
                if (chapterTitleError) {
                  setChapterTitleError(null);
                }
              }}
              error={Boolean(chapterTitleError)}
              helperText={chapterTitleError ?? titleHelperText(chapterEditForm.title)}
              inputProps={{ maxLength: TITLE_LONG_MAX }}
              fullWidth
              autoFocus
            />
            <TextField
              label="Descrição"
              value={chapterEditForm.description}
              onChange={(e) => {
                const value = e.target.value.slice(0, DESCRIPTION_MAX);
                setChapterEditForm((f) => ({
                  ...f,
                  description: value,
                }));
                if (chapterDescriptionError) {
                  setChapterDescriptionError(null);
                }
              }}
              error={Boolean(chapterDescriptionError)}
              helperText={
                chapterDescriptionError ??
                descriptionHelperText(chapterEditForm.description)
              }
              inputProps={{ maxLength: DESCRIPTION_MAX }}
              multiline
              rows={4}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={chapterEditForm.owned}
                  onChange={(e) =>
                    setChapterEditForm((f) => ({
                      ...f,
                      owned: e.target.checked,
                    }))
                  }
                />
              }
              label="Possuo este capítulo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChapterFormOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveChapter}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={itemFormOpen}
        onClose={() => {
          setItemFormOpen(false);
          setEditingItem(null);
          setPendingItemCoverPath(null);
          setItemTitleError(null);
          setItemDescriptionError(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingItem ? "Editar item" : "Novo item"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack spacing={1.5} alignItems="center">
              <BookCover
                coverPath={editingItem?.cover_path ?? pendingItemCoverPath}
                cacheKey={coverCacheEpoch}
                size="large"
                variant="item"
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ImageIcon />}
                  onClick={() => void handlePickItemCover()}
                >
                  Escolher imagem
                </Button>
                {(editingItem?.cover_path ?? pendingItemCoverPath) && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleClearItemCover}
                  >
                    Remover
                  </Button>
                )}
              </Stack>
            </Stack>
            <TextField
              label="Título"
              value={itemEditForm.title}
              onChange={(e) => {
                const value = e.target.value.slice(0, TITLE_LONG_MAX);
                setItemEditForm((f) => ({ ...f, title: value }));
                if (itemTitleError) {
                  setItemTitleError(null);
                }
              }}
              error={Boolean(itemTitleError)}
              helperText={itemTitleError ?? titleHelperText(itemEditForm.title)}
              inputProps={{ maxLength: TITLE_LONG_MAX }}
              fullWidth
              autoFocus
            />
            <TextField
              label="Descrição"
              value={itemEditForm.description}
              onChange={(e) => {
                const value = e.target.value.slice(0, DESCRIPTION_MAX);
                setItemEditForm((f) => ({
                  ...f,
                  description: value,
                }));
                if (itemDescriptionError) {
                  setItemDescriptionError(null);
                }
              }}
              error={Boolean(itemDescriptionError)}
              helperText={
                itemDescriptionError ?? descriptionHelperText(itemEditForm.description)
              }
              inputProps={{ maxLength: DESCRIPTION_MAX }}
              multiline
              rows={4}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={itemEditForm.owned}
                  onChange={(e) =>
                    setItemEditForm((f) => ({
                      ...f,
                      owned: e.target.checked,
                    }))
                  }
                />
              }
              label="Possuo este item"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemFormOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveItem}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onCancel={closeConfirm}
        onConfirm={() => void handleConfirmAction()}
      />
    </Box>
  );
}
