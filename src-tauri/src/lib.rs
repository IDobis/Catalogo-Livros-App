mod db;
mod text_limits;

use db::{backup_filename, cover_path, delete_cover_file, validate_backup_db, DbState};
use text_limits::{parse_description, parse_optional_title, parse_required_title};
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::{DialogExt, FilePath};

const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "gif"];

fn pick_image_source(app: &AppHandle, title: &str) -> Result<PathBuf, String> {
    let selected = app
        .dialog()
        .file()
        .set_title(title)
        .add_filter("Imagens", &["png", "jpg", "jpeg", "webp", "gif"])
        .blocking_pick_file();

    let Some(FilePath::Path(source)) = selected else {
        return Err("Seleção de imagem cancelada.".to_string());
    };

    validate_image_source(&source)?;
    Ok(source)
}

fn validate_image_source(source: &Path) -> Result<(), String> {
    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    if !IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Err("Formato de imagem não suportado.".to_string());
    }

    Ok(())
}

fn cover_filename(entity_id: i64, source: &Path) -> String {
    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();
    format!("{entity_id}.{extension}")
}

fn copy_cover_image(
    source: &Path,
    entity_id: i64,
    covers_dir: &Path,
    old_cover: &Option<String>,
) -> Result<String, String> {
    let filename = cover_filename(entity_id, source);
    let dest = covers_dir.join(&filename);

    if old_cover.as_ref().is_some_and(|old| old != &filename) {
        delete_cover_file(covers_dir, old_cover);
    }

    std::fs::copy(source, &dest).map_err(|e| format!("copiar imagem: {e}"))?;
    Ok(filename)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Book {
    pub id: i64,
    pub title: String,
    pub long_titulo: Option<String>,
    pub description: Option<String>,
    pub owned: bool,
    pub cover_path: Option<String>,
    pub total_chapter_count: i32,
    pub owned_chapter_count: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chapter {
    pub id: i64,
    pub book_id: i64,
    pub chapter_number: i32,
    pub chapter_title: Option<String>,
    pub long_titulo: Option<String>,
    pub description: Option<String>,
    pub cover_path: Option<String>,
    pub owned: bool,
    pub total_item_count: i32,
    pub owned_item_count: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: i64,
    pub chapter_id: i64,
    pub item_number: i32,
    pub item_title: Option<String>,
    pub long_titulo: Option<String>,
    pub description: Option<String>,
    pub cover_path: Option<String>,
    pub owned: bool,
}

#[derive(Debug, Serialize)]
pub struct BackupResult {
    pub path: String,
    pub message: String,
}

const BOOK_SELECT: &str = "
    SELECT
        b.id,
        b.title,
        b.long_titulo,
        b.description,
        b.owned,
        b.cover_image,
        (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id) AS total_chapter_count,
        (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.owned = 1) AS owned_chapter_count
    FROM books b
";

fn row_to_book(row: &Row, covers_dir: &Path) -> rusqlite::Result<Book> {
    let cover_image: Option<String> = row.get(5)?;
    Ok(Book {
        id: row.get(0)?,
        title: row.get(1)?,
        long_titulo: row.get(2)?,
        description: row.get(3)?,
        owned: row.get::<_, i32>(4)? != 0,
        cover_path: cover_path(covers_dir, &cover_image),
        total_chapter_count: row.get(6)?,
        owned_chapter_count: row.get(7)?,
    })
}

fn fetch_book(
    conn: &rusqlite::Connection,
    id: i64,
    covers_dir: &Path,
) -> rusqlite::Result<Book> {
    conn.query_row(
        &format!("{BOOK_SELECT} WHERE b.id = ?1"),
        params![id],
        |row| row_to_book(row, covers_dir),
    )
}

#[tauri::command]
fn save_book(
    state: State<DbState>,
    title: String,
    description: Option<String>,
    owned: bool,
) -> Result<Book, String> {
    let parsed = parse_required_title(&title, "O título da coleção é obrigatório.")?;
    let description = parse_description(description)?;

    let covers_dir = state.book_covers_dir();
    state
        .with_conn(|conn| {
            let sort_order: i32 = conn.query_row(
                "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM books",
                [],
                |row| row.get(0),
            )?;

            conn.execute(
                "INSERT INTO books (title, long_titulo, description, owned, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    parsed.short_title,
                    parsed.long_titulo,
                    description,
                    owned as i32,
                    sort_order
                ],
            )?;

            let id = conn.last_insert_rowid();
            fetch_book(conn, id, &covers_dir)
        })
        .map_err(|e| e.to_string())
}

fn fetch_books(conn: &rusqlite::Connection, covers_dir: &Path) -> rusqlite::Result<Vec<Book>> {
    let mut stmt = conn.prepare(&format!(
        "{BOOK_SELECT} ORDER BY b.sort_order ASC, b.id ASC"
    ))?;

    let books = stmt
        .query_map([], |row| row_to_book(row, covers_dir))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(books)
}

#[tauri::command]
fn list_books(state: State<DbState>) -> Result<Vec<Book>, String> {
    let covers_dir = state.book_covers_dir();
    state
        .with_conn(|conn| fetch_books(conn, &covers_dir))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn reorder_books(state: State<DbState>, book_ids: Vec<i64>) -> Result<Vec<Book>, String> {
    let covers_dir = state.book_covers_dir();
    state
        .with_conn(|conn| {
            let existing = fetch_books(conn, &covers_dir)?;
            if existing.len() != book_ids.len() {
                return Err(rusqlite::Error::InvalidQuery);
            }

            for (index, id) in book_ids.iter().enumerate() {
                let exists: bool = conn.query_row(
                    "SELECT COUNT(*) FROM books WHERE id = ?1",
                    params![id],
                    |row| row.get::<_, i32>(0),
                )? > 0;

                if !exists {
                    return Err(rusqlite::Error::QueryReturnedNoRows);
                }

                conn.execute(
                    "UPDATE books SET sort_order = ?1 WHERE id = ?2",
                    params![(index + 1) as i32, id],
                )?;
            }

            fetch_books(conn, &covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_book(
    state: State<DbState>,
    id: i64,
    title: String,
    description: Option<String>,
    owned: bool,
) -> Result<Book, String> {
    let parsed = parse_required_title(&title, "O título da coleção é obrigatório.")?;
    let description = parse_description(description)?;

    let covers_dir = state.book_covers_dir();
    state
        .with_conn(|conn| {
            let affected = conn.execute(
                "UPDATE books SET title = ?1, long_titulo = ?2, description = ?3, owned = ?4 WHERE id = ?5",
                params![
                    parsed.short_title,
                    parsed.long_titulo,
                    description,
                    owned as i32,
                    id
                ],
            )?;

            if affected == 0 {
                return Err(rusqlite::Error::QueryReturnedNoRows);
            }

            fetch_book(conn, id, &covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_book(state: State<DbState>, id: i64) -> Result<(), String> {
    let book_covers_dir = state.book_covers_dir();
    let chapter_covers_dir = state.chapter_covers_dir();
    let item_covers_dir = state.item_covers_dir();
    state
        .with_conn(|conn| {
            let cover_image: Option<String> = conn.query_row(
                "SELECT cover_image FROM books WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )?;

            let chapter_covers: Vec<Option<String>> = conn
                .prepare("SELECT cover_image FROM chapters WHERE book_id = ?1")?
                .query_map(params![id], |row| row.get(0))?
                .collect::<Result<Vec<_>, _>>()?;

            let item_covers: Vec<Option<String>> = conn
                .prepare(
                    "SELECT cover_image FROM items WHERE chapter_id IN (
                        SELECT id FROM chapters WHERE book_id = ?1
                    )",
                )?
                .query_map(params![id], |row| row.get(0))?
                .collect::<Result<Vec<_>, _>>()?;

            conn.execute("DELETE FROM books WHERE id = ?1", params![id])?;
            delete_cover_file(&book_covers_dir, &cover_image);
            for cover in chapter_covers {
                delete_cover_file(&chapter_covers_dir, &cover);
            }
            for cover in item_covers {
                delete_cover_file(&item_covers_dir, &cover);
            }
            Ok(())
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn pick_image_file(app: AppHandle, title: String) -> Result<String, String> {
    pick_image_source(&app, &title).map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn set_book_cover(app: AppHandle, state: State<DbState>, book_id: i64) -> Result<Book, String> {
    let source = pick_image_source(&app, "Escolher capa da coleção")?;
    set_book_cover_from_path(state, book_id, source.to_string_lossy().to_string())
}

#[tauri::command]
fn set_book_cover_from_path(
    state: State<DbState>,
    book_id: i64,
    source_path: String,
) -> Result<Book, String> {
    let source = PathBuf::from(&source_path);
    validate_image_source(&source)?;
    let covers_dir = state.book_covers_dir();

    state
        .with_conn(|conn| {
            let old_cover: Option<String> = conn.query_row(
                "SELECT cover_image FROM books WHERE id = ?1",
                params![book_id],
                |row| row.get(0),
            )?;

            let filename = copy_cover_image(&source, book_id, &covers_dir, &old_cover)
                .map_err(|e| rusqlite::Error::InvalidPath(e.into()))?;

            let affected = conn.execute(
                "UPDATE books SET cover_image = ?1 WHERE id = ?2",
                params![filename, book_id],
            )?;

            if affected == 0 {
                return Err(rusqlite::Error::QueryReturnedNoRows);
            }

            fetch_book(conn, book_id, &covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_book_cover(state: State<DbState>, book_id: i64) -> Result<Book, String> {
    let covers_dir = state.book_covers_dir();
    state
        .with_conn(|conn| {
            let cover_image: Option<String> = conn.query_row(
                "SELECT cover_image FROM books WHERE id = ?1",
                params![book_id],
                |row| row.get(0),
            )?;

            delete_cover_file(&covers_dir, &cover_image);

            conn.execute(
                "UPDATE books SET cover_image = NULL WHERE id = ?1",
                params![book_id],
            )?;

            fetch_book(conn, book_id, &covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_chapter(
    state: State<DbState>,
    book_id: i64,
    chapter_title: Option<String>,
    description: Option<String>,
    owned: bool,
) -> Result<Chapter, String> {
    let (chapter_title, long_titulo) = parse_optional_title(chapter_title)?;
    let description = parse_description(description)?;

    let chapter_covers_dir = state.chapter_covers_dir();
    state
        .with_conn(|conn| {
            let chapter_number: i32 = conn.query_row(
                "SELECT COALESCE(MAX(chapter_number), 0) + 1 FROM chapters WHERE book_id = ?1",
                params![book_id],
                |row| row.get(0),
            )?;

            conn.execute(
                "INSERT INTO chapters (book_id, chapter_number, chapter_title, long_titulo, description, owned) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    book_id,
                    chapter_number,
                    chapter_title,
                    long_titulo,
                    description,
                    owned as i32
                ],
            )?;

            let id = conn.last_insert_rowid();
            fetch_chapter(conn, id, &chapter_covers_dir)
        })
        .map_err(|e| e.to_string())
}

const CHAPTER_SELECT: &str = "
    SELECT
        c.id,
        c.book_id,
        c.chapter_number,
        c.chapter_title,
        c.long_titulo,
        c.description,
        c.cover_image,
        c.owned,
        (SELECT COUNT(*) FROM items i WHERE i.chapter_id = c.id) AS total_item_count,
        (SELECT COUNT(*) FROM items i WHERE i.chapter_id = c.id AND i.owned = 1) AS owned_item_count
    FROM chapters c
";

fn row_to_chapter(row: &Row, chapter_covers_dir: &Path) -> rusqlite::Result<Chapter> {
    let cover_image: Option<String> = row.get(6)?;
    Ok(Chapter {
        id: row.get(0)?,
        book_id: row.get(1)?,
        chapter_number: row.get(2)?,
        chapter_title: row.get(3)?,
        long_titulo: row.get(4)?,
        description: row.get(5)?,
        cover_path: cover_path(chapter_covers_dir, &cover_image),
        owned: row.get::<_, i32>(7)? != 0,
        total_item_count: row.get(8)?,
        owned_item_count: row.get(9)?,
    })
}

fn fetch_chapter(
    conn: &rusqlite::Connection,
    id: i64,
    chapter_covers_dir: &Path,
) -> rusqlite::Result<Chapter> {
    conn.query_row(
        &format!("{CHAPTER_SELECT} WHERE c.id = ?1"),
        params![id],
        |row| row_to_chapter(row, chapter_covers_dir),
    )
}

fn fetch_chapters(
    conn: &rusqlite::Connection,
    book_id: i64,
    chapter_covers_dir: &Path,
) -> rusqlite::Result<Vec<Chapter>> {
    let mut stmt = conn.prepare(&format!(
        "{CHAPTER_SELECT} WHERE c.book_id = ?1 ORDER BY c.chapter_number ASC"
    ))?;

    let chapters = stmt
        .query_map(params![book_id], |row| row_to_chapter(row, chapter_covers_dir))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(chapters)
}

#[tauri::command]
fn update_chapter(
    state: State<DbState>,
    id: i64,
    chapter_title: Option<String>,
    description: Option<String>,
    owned: bool,
) -> Result<Chapter, String> {
    let (chapter_title, long_titulo) = parse_optional_title(chapter_title)?;
    let description = parse_description(description)?;

    let chapter_covers_dir = state.chapter_covers_dir();
    state
        .with_conn(|conn| {
            let affected = conn.execute(
                "UPDATE chapters SET chapter_title = ?1, long_titulo = ?2, description = ?3, owned = ?4 WHERE id = ?5",
                params![chapter_title, long_titulo, description, owned as i32, id],
            )?;

            if affected == 0 {
                return Err(rusqlite::Error::QueryReturnedNoRows);
            }

            fetch_chapter(conn, id, &chapter_covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_chapter_cover(
    app: AppHandle,
    state: State<DbState>,
    chapter_id: i64,
) -> Result<Chapter, String> {
    let source = pick_image_source(&app, "Escolher imagem do capítulo")?;
    set_chapter_cover_from_path(
        state,
        chapter_id,
        source.to_string_lossy().to_string(),
    )
}

#[tauri::command]
fn set_chapter_cover_from_path(
    state: State<DbState>,
    chapter_id: i64,
    source_path: String,
) -> Result<Chapter, String> {
    let source = PathBuf::from(&source_path);
    validate_image_source(&source)?;
    let chapter_covers_dir = state.chapter_covers_dir();

    state
        .with_conn(|conn| {
            let old_cover: Option<String> = conn.query_row(
                "SELECT cover_image FROM chapters WHERE id = ?1",
                params![chapter_id],
                |row| row.get(0),
            )?;

            let filename =
                copy_cover_image(&source, chapter_id, &chapter_covers_dir, &old_cover)
                    .map_err(|e| rusqlite::Error::InvalidPath(e.into()))?;

            let affected = conn.execute(
                "UPDATE chapters SET cover_image = ?1 WHERE id = ?2",
                params![filename, chapter_id],
            )?;

            if affected == 0 {
                return Err(rusqlite::Error::QueryReturnedNoRows);
            }

            fetch_chapter(conn, chapter_id, &chapter_covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_chapter_cover(state: State<DbState>, chapter_id: i64) -> Result<Chapter, String> {
    let chapter_covers_dir = state.chapter_covers_dir();
    state
        .with_conn(|conn| {
            let cover_image: Option<String> = conn.query_row(
                "SELECT cover_image FROM chapters WHERE id = ?1",
                params![chapter_id],
                |row| row.get(0),
            )?;

            delete_cover_file(&chapter_covers_dir, &cover_image);

            conn.execute(
                "UPDATE chapters SET cover_image = NULL WHERE id = ?1",
                params![chapter_id],
            )?;

            fetch_chapter(conn, chapter_id, &chapter_covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_chapters(state: State<DbState>, book_id: i64) -> Result<Vec<Chapter>, String> {
    let chapter_covers_dir = state.chapter_covers_dir();
    state
        .with_conn(|conn| fetch_chapters(conn, book_id, &chapter_covers_dir))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn reorder_chapters(
    state: State<DbState>,
    book_id: i64,
    chapter_ids: Vec<i64>,
) -> Result<Vec<Chapter>, String> {
    let chapter_covers_dir = state.chapter_covers_dir();
    state
        .with_conn(|conn| {
            let existing = fetch_chapters(conn, book_id, &chapter_covers_dir)?;
            if existing.len() != chapter_ids.len() {
                return Err(rusqlite::Error::InvalidQuery);
            }

            for (index, id) in chapter_ids.iter().enumerate() {
                let belongs_to_book: bool = conn.query_row(
                    "SELECT COUNT(*) FROM chapters WHERE id = ?1 AND book_id = ?2",
                    params![id, book_id],
                    |row| row.get::<_, i32>(0),
                )? > 0;

                if !belongs_to_book {
                    return Err(rusqlite::Error::QueryReturnedNoRows);
                }

                conn.execute(
                    "UPDATE chapters SET chapter_number = ?1 WHERE id = ?2 AND book_id = ?3",
                    params![(index + 1) as i32, id, book_id],
                )?;
            }

            fetch_chapters(conn, book_id, &chapter_covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_chapter(state: State<DbState>, id: i64) -> Result<(), String> {
    let chapter_covers_dir = state.chapter_covers_dir();
    let item_covers_dir = state.item_covers_dir();
    state
        .with_conn(|conn| {
            let cover_image: Option<String> = conn.query_row(
                "SELECT cover_image FROM chapters WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )?;

            let item_covers: Vec<Option<String>> = conn
                .prepare("SELECT cover_image FROM items WHERE chapter_id = ?1")?
                .query_map(params![id], |row| row.get(0))?
                .collect::<Result<Vec<_>, _>>()?;

            conn.execute("DELETE FROM chapters WHERE id = ?1", params![id])?;
            delete_cover_file(&chapter_covers_dir, &cover_image);
            for cover in item_covers {
                delete_cover_file(&item_covers_dir, &cover);
            }
            Ok(())
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_item(
    state: State<DbState>,
    chapter_id: i64,
    item_title: Option<String>,
    description: Option<String>,
    owned: bool,
) -> Result<Item, String> {
    let (item_title, long_titulo) = parse_optional_title(item_title)?;
    let description = parse_description(description)?;

    let item_covers_dir = state.item_covers_dir();
    state
        .with_conn(|conn| {
            let item_number: i32 = conn.query_row(
                "SELECT COALESCE(MAX(item_number), 0) + 1 FROM items WHERE chapter_id = ?1",
                params![chapter_id],
                |row| row.get(0),
            )?;

            conn.execute(
                "INSERT INTO items (chapter_id, item_number, item_title, long_titulo, description, owned) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    chapter_id,
                    item_number,
                    item_title,
                    long_titulo,
                    description,
                    owned as i32
                ],
            )?;

            let id = conn.last_insert_rowid();
            sync_chapter_owned_from_items(conn, chapter_id)?;
            fetch_item(conn, id, &item_covers_dir)
        })
        .map_err(|e| e.to_string())
}

fn row_to_item(row: &Row, item_covers_dir: &Path) -> rusqlite::Result<Item> {
    let cover_image: Option<String> = row.get(6)?;
    Ok(Item {
        id: row.get(0)?,
        chapter_id: row.get(1)?,
        item_number: row.get(2)?,
        item_title: row.get(3)?,
        long_titulo: row.get(4)?,
        description: row.get(5)?,
        cover_path: cover_path(item_covers_dir, &cover_image),
        owned: row.get::<_, i32>(7)? != 0,
    })
}

fn fetch_item(
    conn: &rusqlite::Connection,
    id: i64,
    item_covers_dir: &Path,
) -> rusqlite::Result<Item> {
    conn.query_row(
        "SELECT id, chapter_id, item_number, item_title, long_titulo, description, cover_image, owned
         FROM items WHERE id = ?1",
        params![id],
        |row| row_to_item(row, item_covers_dir),
    )
}

fn fetch_items(
    conn: &rusqlite::Connection,
    chapter_id: i64,
    item_covers_dir: &Path,
) -> rusqlite::Result<Vec<Item>> {
    let mut stmt = conn.prepare(
        "SELECT id, chapter_id, item_number, item_title, long_titulo, description, cover_image, owned
         FROM items WHERE chapter_id = ?1
         ORDER BY item_number ASC",
    )?;

    let items = stmt
        .query_map(params![chapter_id], |row| row_to_item(row, item_covers_dir))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(items)
}

fn sync_chapter_owned_from_items(
    conn: &rusqlite::Connection,
    chapter_id: i64,
) -> rusqlite::Result<()> {
    let (total, owned): (i32, i32) = conn.query_row(
        "SELECT
            COUNT(*),
            COALESCE(SUM(CASE WHEN owned = 1 THEN 1 ELSE 0 END), 0)
         FROM items WHERE chapter_id = ?1",
        params![chapter_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    if total == 0 {
        return Ok(());
    }

    let all_owned = owned == total;
    conn.execute(
        "UPDATE chapters SET owned = ?1 WHERE id = ?2",
        params![all_owned as i32, chapter_id],
    )?;

    Ok(())
}

#[tauri::command]
fn update_item(
    state: State<DbState>,
    id: i64,
    item_title: Option<String>,
    description: Option<String>,
    owned: bool,
) -> Result<Item, String> {
    let (item_title, long_titulo) = parse_optional_title(item_title)?;
    let description = parse_description(description)?;

    let item_covers_dir = state.item_covers_dir();
    state
        .with_conn(|conn| {
            let affected = conn.execute(
                "UPDATE items SET item_title = ?1, long_titulo = ?2, description = ?3, owned = ?4 WHERE id = ?5",
                params![item_title, long_titulo, description, owned as i32, id],
            )?;

            if affected == 0 {
                return Err(rusqlite::Error::QueryReturnedNoRows);
            }

            let chapter_id: i64 = conn.query_row(
                "SELECT chapter_id FROM items WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )?;
            sync_chapter_owned_from_items(conn, chapter_id)?;

            fetch_item(conn, id, &item_covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_item_cover(app: AppHandle, state: State<DbState>, item_id: i64) -> Result<Item, String> {
    let source = pick_image_source(&app, "Escolher imagem do item")?;
    set_item_cover_from_path(state, item_id, source.to_string_lossy().to_string())
}

#[tauri::command]
fn set_item_cover_from_path(
    state: State<DbState>,
    item_id: i64,
    source_path: String,
) -> Result<Item, String> {
    let source = PathBuf::from(&source_path);
    validate_image_source(&source)?;
    let item_covers_dir = state.item_covers_dir();

    state
        .with_conn(|conn| {
            let old_cover: Option<String> = conn.query_row(
                "SELECT cover_image FROM items WHERE id = ?1",
                params![item_id],
                |row| row.get(0),
            )?;

            let filename = copy_cover_image(&source, item_id, &item_covers_dir, &old_cover)
                .map_err(|e| rusqlite::Error::InvalidPath(e.into()))?;

            let affected = conn.execute(
                "UPDATE items SET cover_image = ?1 WHERE id = ?2",
                params![filename, item_id],
            )?;

            if affected == 0 {
                return Err(rusqlite::Error::QueryReturnedNoRows);
            }

            fetch_item(conn, item_id, &item_covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_item_cover(state: State<DbState>, item_id: i64) -> Result<Item, String> {
    let item_covers_dir = state.item_covers_dir();
    state
        .with_conn(|conn| {
            let cover_image: Option<String> = conn.query_row(
                "SELECT cover_image FROM items WHERE id = ?1",
                params![item_id],
                |row| row.get(0),
            )?;

            delete_cover_file(&item_covers_dir, &cover_image);

            conn.execute(
                "UPDATE items SET cover_image = NULL WHERE id = ?1",
                params![item_id],
            )?;

            fetch_item(conn, item_id, &item_covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_items(state: State<DbState>, chapter_id: i64) -> Result<Vec<Item>, String> {
    let item_covers_dir = state.item_covers_dir();
    state
        .with_conn(|conn| fetch_items(conn, chapter_id, &item_covers_dir))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn reorder_items(
    state: State<DbState>,
    chapter_id: i64,
    item_ids: Vec<i64>,
) -> Result<Vec<Item>, String> {
    let item_covers_dir = state.item_covers_dir();
    state
        .with_conn(|conn| {
            let existing = fetch_items(conn, chapter_id, &item_covers_dir)?;
            if existing.len() != item_ids.len() {
                return Err(rusqlite::Error::InvalidQuery);
            }

            for (index, id) in item_ids.iter().enumerate() {
                let belongs_to_chapter: bool = conn.query_row(
                    "SELECT COUNT(*) FROM items WHERE id = ?1 AND chapter_id = ?2",
                    params![id, chapter_id],
                    |row| row.get::<_, i32>(0),
                )? > 0;

                if !belongs_to_chapter {
                    return Err(rusqlite::Error::QueryReturnedNoRows);
                }

                conn.execute(
                    "UPDATE items SET item_number = ?1 WHERE id = ?2 AND chapter_id = ?3",
                    params![(index + 1) as i32, id, chapter_id],
                )?;
            }

            fetch_items(conn, chapter_id, &item_covers_dir)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_item(state: State<DbState>, id: i64) -> Result<(), String> {
    let item_covers_dir = state.item_covers_dir();
    state
        .with_conn(|conn| {
            let chapter_id: i64 = conn.query_row(
                "SELECT chapter_id FROM items WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )?;
            let cover_image: Option<String> = conn.query_row(
                "SELECT cover_image FROM items WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )?;

            conn.execute("DELETE FROM items WHERE id = ?1", params![id])?;
            delete_cover_file(&item_covers_dir, &cover_image);
            sync_chapter_owned_from_items(conn, chapter_id)?;
            Ok(())
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_database_path(state: State<DbState>) -> Result<String, String> {
    Ok(state.db_path().to_string_lossy().to_string())
}

#[tauri::command]
fn export_database(app: AppHandle, state: State<DbState>) -> Result<BackupResult, String> {
    let source = state.db_path();

    let destination = app
        .dialog()
        .file()
        .set_title("Exportar backup")
        .set_file_name(&backup_filename())
        .add_filter("Banco SQLite", &["db"])
        .blocking_save_file();

    let Some(FilePath::Path(dest)) = destination else {
        return Err("Exportação cancelada.".to_string());
    };

    std::fs::copy(&source, &dest).map_err(|e| format!("Falha ao exportar backup: {e}"))?;

    let path = dest.to_string_lossy().to_string();
    Ok(BackupResult {
        message: "Backup exportado com sucesso.".to_string(),
        path,
    })
}

#[tauri::command]
fn import_database(app: AppHandle, state: State<DbState>) -> Result<BackupResult, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("Importar backup")
        .add_filter("Banco SQLite", &["db"])
        .blocking_pick_file();

    let Some(FilePath::Path(source)) = selected else {
        return Err("Importação cancelada.".to_string());
    };

    validate_backup_db(&source)?;

    let current_path = state.db_path();

    if let Some(parent) = current_path.parent() {
        let safety_backup = parent.join(format!(
            "catalogo_livros_pre_import_{}.db",
            chrono::Local::now().format("%Y%m%d_%H%M%S")
        ));
        if current_path.exists() {
            std::fs::copy(&current_path, &safety_backup)
                .map_err(|e| format!("Falha ao criar backup de segurança: {e}"))?;
        }
    }

    std::fs::copy(&source, &current_path)
        .map_err(|e| format!("Falha ao importar backup: {e}"))?;

    state
        .reconnect()
        .map_err(|e| format!("Backup importado, mas falha ao reconectar: {e}"))?;

    Ok(BackupResult {
        message: "Backup importado com sucesso. Seus dados foram restaurados.".to_string(),
        path: source.to_string_lossy().to_string(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Falha ao resolver diretório de dados do app");

            let db_path = app_data_dir.join("catalogo_livros.db");
            let db_state = DbState::new(db_path).expect("Falha ao inicializar SQLite");

            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_book,
            list_books,
            reorder_books,
            update_book,
            delete_book,
            pick_image_file,
            set_book_cover,
            set_book_cover_from_path,
            remove_book_cover,
            save_chapter,
            update_chapter,
            set_chapter_cover,
            set_chapter_cover_from_path,
            remove_chapter_cover,
            list_chapters,
            reorder_chapters,
            delete_chapter,
            save_item,
            update_item,
            set_item_cover,
            set_item_cover_from_path,
            remove_item_cover,
            list_items,
            reorder_items,
            delete_item,
            get_database_path,
            export_database,
            import_database,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicação Tauri");
}
