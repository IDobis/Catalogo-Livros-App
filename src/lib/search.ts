import { displayTitle } from "@/lib/fieldLimits";
import type { Book, Chapter, Item } from "@/lib/tauri";

function includesQuery(text: string | null | undefined, query: string): boolean {
  return (text ?? "").toLowerCase().includes(query);
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesBook(book: Book, query: string): boolean {
  if (!query) return true;
  return (
    includesQuery(book.title, query) ||
    includesQuery(book.long_titulo, query) ||
    includesQuery(book.description, query) ||
    includesQuery(displayTitle(book.title, book.long_titulo), query)
  );
}

export function matchesChapter(chapter: Chapter, query: string): boolean {
  if (!query) return true;
  return (
    includesQuery(chapter.chapter_title, query) ||
    includesQuery(chapter.long_titulo, query) ||
    includesQuery(chapter.description, query) ||
    includesQuery(displayTitle(chapter.chapter_title, chapter.long_titulo), query)
  );
}

export function matchesItem(item: Item, query: string): boolean {
  if (!query) return true;
  return (
    includesQuery(item.item_title, query) ||
    includesQuery(item.long_titulo, query) ||
    includesQuery(item.description, query) ||
    includesQuery(displayTitle(item.item_title, item.long_titulo), query)
  );
}
