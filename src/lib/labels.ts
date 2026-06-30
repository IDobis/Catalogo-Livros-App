import type { Chapter, Item } from "@/lib/tauri";

export function chapterDisplayName(chapter: Chapter): string {
  return chapter.chapter_title?.trim() || "Sem título";
}

export function itemDisplayName(item: Item): string {
  return item.item_title?.trim() || "Sem título";
}
