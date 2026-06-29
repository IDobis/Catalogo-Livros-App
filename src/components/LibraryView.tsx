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
import {
  deleteBook,
  deleteChapter,
  deleteItem,
  listBooks,
  listChapters,
  listItems,
  removeBookCover,
  removeChapterCover,
  removeItemCover,
  saveBook,
  saveChapter,
  saveItem,
  setBookCover,
  setChapterCover,
  setItemCover,
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
  const [chapterForm, setChapterForm] = useState({ number: "", title: "" });
  const [itemForm, setItemForm] = useState({ number: "", title: "" });
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirmar",
  });
  const pendingConfirmRef = useRef<(() => Promise<void>) | null>(null);

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
    try {
      const data = await listBooks();
      setBooks(data);
      setSelectedBook((current) => {
        if (!current) return null;
        return data.find((b) => b.id === current.id) ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar coleções.");
    }
  }, []);

  const loadChapters = useCallback(async (bookId: number) => {
    try {
      const data = await listChapters(bookId);
      setChapters(data);
      setSelectedChapter((current) => {
        if (!current) return null;
        return data.find((c) => c.id === current.id) ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar capítulos.");
    }
  }, []);

  const loadItems = useCallback(async (chapterId: number) => {
    try {
      const data = await listItems(chapterId);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar itens.");
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
    setFormOpen(true);
  };

  const openEditForm = (book: Book) => {
    setEditingBook(book);
    setForm({
      title: book.title,
      description: book.description ?? "",
    });
    setFormOpen(true);
  };

  const openEditItemForm = (item: Item) => {
    setEditingItem(item);
    setItemEditForm({
      title: item.item_title ?? "",
      description: item.description ?? "",
      owned: item.owned,
    });
    setItemFormOpen(true);
  };

  const handleSaveItem = async () => {
    if (!editingItem || !selectedChapter) return;
    try {
      await updateItem(
        editingItem.id,
        itemEditForm.title.trim() || null,
        itemEditForm.description.trim() || null,
        itemEditForm.owned,
      );
      setItemFormOpen(false);
      await loadItems(selectedChapter.id);
      if (selectedBook) {
        await loadChapters(selectedBook.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar item.");
    }
  };

  const handleSetItemCover = async (itemId: number) => {
    if (!selectedChapter) return;
    try {
      const updated = await setItemCover(itemId);
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
      title: chapter.chapter_title ?? "",
      description: chapter.description ?? "",
      owned: chapter.owned,
    });
    setChapterFormOpen(true);
  };

  const handleSaveChapter = async () => {
    if (!editingChapter || !selectedBook) return;
    try {
      const updated = await updateChapter(
        editingChapter.id,
        chapterEditForm.title.trim() || null,
        chapterEditForm.description.trim() || null,
        chapterEditForm.owned,
      );
      setChapterFormOpen(false);
      await loadChapters(selectedBook.id);
      await loadBooks();
      if (editingChapter.id === updated.id) {
        setEditingChapter(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar capítulo.");
    }
  };

  const handleSetChapterCover = async (chapterId: number) => {
    if (!selectedBook) return;
    try {
      const updated = await setChapterCover(chapterId);
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
    try {
      const description = form.description.trim() || null;
      if (editingBook) {
        await updateBook(
          editingBook.id,
          form.title,
          description,
          editingBook.owned,
        );
      } else {
        await saveBook(form.title, description, false);
      }
      setFormOpen(false);
      await loadBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar coleção.");
    }
  };

  const handleDeleteBook = (book: Book) => {
    openConfirm(
      "Excluir coleção?",
      `Tem certeza que deseja excluir a coleção "${book.title}"? Esta ação não pode ser desfeita.`,
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
    setSelectedBook(book);
    setSelectedChapter(null);
    setError(null);
  };

  const handleOpenChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setError(null);
  };

  const handleBack = () => {
    if (selectedChapter) {
      setSelectedChapter(null);
      setItemForm({ number: "", title: "" });
      setError(null);
      return;
    }
    setSelectedBook(null);
    setChapterForm({ number: "", title: "" });
    setError(null);
    void loadBooks();
  };

  const handleAddChapter = async () => {
    if (!selectedBook) return;
    const number = parseInt(chapterForm.number, 10);
    if (Number.isNaN(number) || number < 1) {
      setError("Informe um número de capítulo válido.");
      return;
    }
    try {
      await saveChapter(
        selectedBook.id,
        number,
        chapterForm.title.trim() || null,
      );
      setChapterForm({ number: "", title: "" });
      await loadChapters(selectedBook.id);
      await loadBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar capítulo.");
    }
  };

  const handleDeleteChapter = (chapter: Chapter) => {
    const title = chapter.chapter_title
      ? `Cap. ${chapter.chapter_number} — ${chapter.chapter_title}`
      : `Cap. ${chapter.chapter_number}`;
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

  const handleAddItem = async () => {
    if (!selectedChapter) return;
    const number = parseInt(itemForm.number, 10);
    if (Number.isNaN(number) || number < 1) {
      setError("Informe um número de item válido.");
      return;
    }
    try {
      await saveItem(
        selectedChapter.id,
        number,
        itemForm.title.trim() || null,
      );
      setItemForm({ number: "", title: "" });
      await loadItems(selectedChapter.id);
      if (selectedBook) {
        await loadChapters(selectedBook.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar item.");
    }
  };

  const handleDeleteItem = (item: Item) => {
    const title = item.item_title
      ? `Item ${item.item_number} — ${item.item_title}`
      : `Item ${item.item_number}`;
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
            sx={{
              mb: 3,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">Coleções</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateForm}
            >
              Nova coleção
            </Button>
          </Stack>

          <BookSortableList
            books={books}
            onBooksChange={setBooks}
            onOpen={handleOpenBook}
            onEdit={openEditForm}
            onDelete={handleDeleteBook}
            onError={setError}
          />
        </Box>
      ) : selectedChapter ? (
        <Box sx={{ maxWidth: 640, mx: "auto", width: "100%", overflow: "hidden" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center" }}>
            <IconButton onClick={handleBack} aria-label="Voltar">
              <ArrowBackIcon />
            </IconButton>
            <BookCover coverPath={selectedChapter.cover_path} size="medium" variant="chapter" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                Cap. {selectedChapter.chapter_number}
                {selectedChapter.chapter_title
                  ? ` — ${selectedChapter.chapter_title}`
                  : ""}
              </Typography>
            </Box>
            <IconButton onClick={() => openEditChapterForm(selectedChapter)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Itens
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              label="Nº"
              type="number"
              value={itemForm.number}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, number: e.target.value }))
              }
              sx={{ width: 90 }}
            />
            <TextField
              size="small"
              label="Título do item"
              value={itemForm.title}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, title: e.target.value }))
              }
              fullWidth
            />
            <Button variant="outlined" onClick={handleAddItem}>
              Adicionar
            </Button>
          </Stack>

          <ItemSortableList
            chapterId={selectedChapter.id}
            items={items}
            onItemsChange={setItems}
            onEdit={openEditItemForm}
            onDelete={handleDeleteItem}
            onError={setError}
          />
        </Box>
      ) : (
        <Box sx={{ maxWidth: 640, mx: "auto", width: "100%", overflow: "hidden" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center" }}>
            <IconButton onClick={handleBack} aria-label="Voltar">
              <ArrowBackIcon />
            </IconButton>
            <BookCover coverPath={selectedBook.cover_path} size="medium" variant="collection" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {selectedBook.title}
              </Typography>
            </Box>
            <IconButton onClick={() => openEditForm(selectedBook)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Capítulos
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              label="Nº"
              type="number"
              value={chapterForm.number}
              onChange={(e) =>
                setChapterForm((f) => ({ ...f, number: e.target.value }))
              }
              sx={{ width: 90 }}
            />
            <TextField
              size="small"
              label="Título do capítulo"
              value={chapterForm.title}
              onChange={(e) =>
                setChapterForm((f) => ({ ...f, title: e.target.value }))
              }
              fullWidth
            />
            <Button variant="outlined" onClick={handleAddChapter}>
              Adicionar
            </Button>
          </Stack>

          <ChapterSortableList
            bookId={selectedBook.id}
            chapters={chapters}
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
        onClose={() => setFormOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingBook ? "Editar coleção" : "Nova coleção"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editingBook && (
              <Stack spacing={1.5} alignItems="center">
                <BookCover coverPath={editingBook.cover_path} size="large" variant="collection" />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ImageIcon />}
                    onClick={() => handleSetCover(editingBook.id)}
                  >
                    Escolher capa
                  </Button>
                  {editingBook.cover_path && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleRemoveCover(editingBook.id)}
                    >
                      Remover
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}
            <TextField
              label="Título"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              required
              fullWidth
              autoFocus={!editingBook}
            />
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
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
        onClose={() => setChapterFormOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar capítulo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editingChapter && (
              <Stack spacing={1.5} alignItems="center">
                <BookCover coverPath={editingChapter.cover_path} size="large" variant="chapter" />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ImageIcon />}
                    onClick={() => handleSetChapterCover(editingChapter.id)}
                  >
                    Escolher imagem
                  </Button>
                  {editingChapter.cover_path && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleRemoveChapterCover(editingChapter.id)}
                    >
                      Remover
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}
            <TextField
              label="Título"
              value={chapterEditForm.title}
              onChange={(e) =>
                setChapterEditForm((f) => ({ ...f, title: e.target.value }))
              }
              fullWidth
              autoFocus
            />
            <TextField
              label="Descrição"
              value={chapterEditForm.description}
              onChange={(e) =>
                setChapterEditForm((f) => ({
                  ...f,
                  description: e.target.value,
                }))
              }
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
        onClose={() => setItemFormOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editingItem && (
              <Stack spacing={1.5} alignItems="center">
                <BookCover coverPath={editingItem.cover_path} size="large" variant="item" />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ImageIcon />}
                    onClick={() => handleSetItemCover(editingItem.id)}
                  >
                    Escolher imagem
                  </Button>
                  {editingItem.cover_path && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItemCover(editingItem.id)}
                    >
                      Remover
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}
            <TextField
              label="Título"
              value={itemEditForm.title}
              onChange={(e) =>
                setItemEditForm((f) => ({ ...f, title: e.target.value }))
              }
              fullWidth
              autoFocus
            />
            <TextField
              label="Descrição"
              value={itemEditForm.description}
              onChange={(e) =>
                setItemEditForm((f) => ({
                  ...f,
                  description: e.target.value,
                }))
              }
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
