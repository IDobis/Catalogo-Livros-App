"use client";

import {
  Box,
  Button,
  Chip,
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
import { useCallback, useEffect, useState } from "react";
import BookCover from "@/components/BookCover";
import BookSortableList from "@/components/BookSortableList";
import ChapterSortableList from "@/components/ChapterSortableList";
import {
  deleteBook,
  deleteChapter,
  listBooks,
  listChapters,
  removeBookCover,
  removeChapterCover,
  saveBook,
  saveChapter,
  setBookCover,
  setChapterCover,
  updateBook,
  updateChapter,
  type Book,
  type Chapter,
} from "@/lib/tauri";

interface BookFormState {
  title: string;
  description: string;
  owned: boolean;
}

interface ChapterFormState {
  title: string;
  description: string;
}

const emptyBookForm: BookFormState = { title: "", description: "", owned: false };
const emptyChapterForm: ChapterFormState = { title: "", description: "" };

export default function LibraryView() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [chapterFormOpen, setChapterFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [form, setForm] = useState<BookFormState>(emptyBookForm);
  const [chapterEditForm, setChapterEditForm] = useState<ChapterFormState>(emptyChapterForm);
  const [chapterForm, setChapterForm] = useState({ number: "", title: "" });
  const [error, setError] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    try {
      const data = await listBooks();
      setBooks(data);
      setSelectedBook((current) => {
        if (!current) return null;
        return data.find((b) => b.id === current.id) ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar livros.");
    }
  }, []);

  const loadChapters = useCallback(async (bookId: number) => {
    try {
      const data = await listChapters(bookId);
      setChapters(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar capítulos.");
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
    }
  }, [selectedBook, loadChapters]);

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
      owned: book.owned,
    });
    setFormOpen(true);
  };

  const openEditChapterForm = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterEditForm({
      title: chapter.chapter_title ?? "",
      description: chapter.description ?? "",
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
      );
      setChapterFormOpen(false);
      await loadChapters(selectedBook.id);
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

  const handleRemoveChapterCover = async (chapterId: number) => {
    if (!selectedBook) return;
    try {
      const updated = await removeChapterCover(chapterId);
      await loadChapters(selectedBook.id);
      if (editingChapter?.id === chapterId) {
        setEditingChapter(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover imagem.");
    }
  };

  const handleSaveBook = async () => {
    try {
      const description = form.description.trim() || null;
      if (editingBook) {
        await updateBook(editingBook.id, form.title, description, form.owned);
      } else {
        await saveBook(form.title, description, form.owned);
      }
      setFormOpen(false);
      await loadBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar livro.");
    }
  };

  const handleDeleteBook = async (book: Book) => {
    try {
      await deleteBook(book.id);
      if (selectedBook?.id === book.id) {
        setSelectedBook(null);
      }
      await loadBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir livro.");
    }
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

  const handleRemoveCover = async (bookId: number) => {
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
  };

  const handleOpenBook = (book: Book) => {
    setSelectedBook(book);
    setError(null);
  };

  const handleBack = () => {
    setSelectedBook(null);
    setChapterForm({ number: "", title: "" });
    setError(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar capítulo.");
    }
  };

  const handleDeleteChapter = async (chapter: Chapter) => {
    try {
      await deleteChapter(chapter.id);
      if (selectedBook) {
        await loadChapters(selectedBook.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir capítulo.");
    }
  };

  return (
    <Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!selectedBook ? (
        <Box sx={{ maxWidth: 720, mx: "auto", width: "100%" }}>
          <Stack
            direction="row"
            sx={{
              mb: 3,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">Livros</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateForm}
            >
              Novo livro
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
      ) : (
        <Box sx={{ maxWidth: 640, mx: "auto", width: "100%" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center" }}>
            <IconButton onClick={handleBack} aria-label="Voltar">
              <ArrowBackIcon />
            </IconButton>
            <BookCover coverPath={selectedBook.cover_path} size="medium" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {selectedBook.title}
              </Typography>
              <Chip
                size="small"
                label={selectedBook.owned ? "Possuo" : "Não possuo"}
                color={selectedBook.owned ? "success" : "default"}
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
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
          {editingBook ? "Editar livro" : "Novo livro"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editingBook && (
              <Stack spacing={1.5} alignItems="center">
                <BookCover coverPath={editingBook.cover_path} size="large" />
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
            <FormControlLabel
              control={
                <Switch
                  checked={form.owned}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, owned: e.target.checked }))
                  }
                />
              }
              label="Possuo este livro (físico ou digital)"
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
                <BookCover coverPath={editingChapter.cover_path} size="large" />
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChapterFormOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveChapter}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
