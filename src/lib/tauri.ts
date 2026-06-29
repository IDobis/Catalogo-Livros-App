import { invoke } from "@tauri-apps/api/core";

export interface Book {
  id: number;
  title: string;
  description: string | null;
  owned: boolean;
  cover_path: string | null;
  total_chapter_count: number;
  owned_chapter_count: number;
}

export interface Chapter {
  id: number;
  book_id: number;
  chapter_number: number;
  chapter_title: string | null;
  description: string | null;
  cover_path: string | null;
  owned: boolean;
  total_item_count: number;
  owned_item_count: number;
}

export interface Item {
  id: number;
  chapter_id: number;
  item_number: number;
  item_title: string | null;
  description: string | null;
  cover_path: string | null;
  owned: boolean;
}

export interface BackupResult {
  path: string;
  message: string;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri()) {
    throw new Error("Este recurso só está disponível no aplicativo desktop.");
  }
  return invoke<T>(command, args);
}

export async function saveBook(
  title: string,
  description: string | null,
  owned: boolean,
): Promise<Book> {
  return invokeCommand<Book>("save_book", { title, description, owned });
}

export async function listBooks(): Promise<Book[]> {
  return invokeCommand<Book[]>("list_books");
}

export async function reorderBooks(bookIds: number[]): Promise<Book[]> {
  return invokeCommand<Book[]>("reorder_books", { bookIds });
}

export async function updateBook(
  id: number,
  title: string,
  description: string | null,
  owned: boolean,
): Promise<Book> {
  return invokeCommand<Book>("update_book", { id, title, description, owned });
}

export async function deleteBook(id: number): Promise<void> {
  return invokeCommand<void>("delete_book", { id });
}

export async function setBookCover(bookId: number): Promise<Book> {
  return invokeCommand<Book>("set_book_cover", { bookId });
}

export async function removeBookCover(bookId: number): Promise<Book> {
  return invokeCommand<Book>("remove_book_cover", { bookId });
}

export async function saveChapter(
  bookId: number,
  chapterNumber: number,
  chapterTitle: string | null,
  owned = false,
): Promise<Chapter> {
  return invokeCommand<Chapter>("save_chapter", {
    bookId,
    chapterNumber,
    chapterTitle,
    owned,
  });
}

export async function updateChapter(
  id: number,
  chapterTitle: string | null,
  description: string | null,
  owned: boolean,
): Promise<Chapter> {
  return invokeCommand<Chapter>("update_chapter", {
    id,
    chapterTitle,
    description,
    owned,
  });
}

export async function setChapterCover(chapterId: number): Promise<Chapter> {
  return invokeCommand<Chapter>("set_chapter_cover", { chapterId });
}

export async function removeChapterCover(chapterId: number): Promise<Chapter> {
  return invokeCommand<Chapter>("remove_chapter_cover", { chapterId });
}

export async function listChapters(bookId: number): Promise<Chapter[]> {
  return invokeCommand<Chapter[]>("list_chapters", { bookId });
}

export async function reorderChapters(
  bookId: number,
  chapterIds: number[],
): Promise<Chapter[]> {
  return invokeCommand<Chapter[]>("reorder_chapters", { bookId, chapterIds });
}

export async function deleteChapter(id: number): Promise<void> {
  return invokeCommand<void>("delete_chapter", { id });
}

export async function saveItem(
  chapterId: number,
  itemNumber: number,
  itemTitle: string | null,
  owned = false,
): Promise<Item> {
  return invokeCommand<Item>("save_item", {
    chapterId,
    itemNumber,
    itemTitle,
    owned,
  });
}

export async function updateItem(
  id: number,
  itemTitle: string | null,
  description: string | null,
  owned: boolean,
): Promise<Item> {
  return invokeCommand<Item>("update_item", {
    id,
    itemTitle,
    description,
    owned,
  });
}

export async function setItemCover(itemId: number): Promise<Item> {
  return invokeCommand<Item>("set_item_cover", { itemId });
}

export async function removeItemCover(itemId: number): Promise<Item> {
  return invokeCommand<Item>("remove_item_cover", { itemId });
}

export async function listItems(chapterId: number): Promise<Item[]> {
  return invokeCommand<Item[]>("list_items", { chapterId });
}

export async function reorderItems(
  chapterId: number,
  itemIds: number[],
): Promise<Item[]> {
  return invokeCommand<Item[]>("reorder_items", { chapterId, itemIds });
}

export async function deleteItem(id: number): Promise<void> {
  return invokeCommand<void>("delete_item", { id });
}

export async function getDatabasePath(): Promise<string> {
  return invokeCommand<string>("get_database_path");
}

export async function exportDatabase(): Promise<BackupResult> {
  return invokeCommand<BackupResult>("export_database");
}

export async function importDatabase(): Promise<BackupResult> {
  return invokeCommand<BackupResult>("import_database");
}

export { isTauri };
