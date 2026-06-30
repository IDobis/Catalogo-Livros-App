import type { Book, Chapter, Item } from "@/lib/tauri";
import { displayTitle } from "@/lib/fieldLimits";

export function bookDisplayTitle(book: Book): string {
  return displayTitle(book.title, book.long_titulo) || book.title;
}

export function chapterDisplayName(chapter: Chapter): string {
  return displayTitle(chapter.chapter_title, chapter.long_titulo) || "Sem título";
}

export function itemDisplayName(item: Item): string {
  return displayTitle(item.item_title, item.long_titulo) || "Sem título";
}
