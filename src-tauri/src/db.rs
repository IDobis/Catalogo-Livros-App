use rusqlite::{Connection, Result};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const SCHEMA: &str = "
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS books (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT,
    owned       INTEGER NOT NULL DEFAULT 0,
    cover_image TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chapters (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id        INTEGER NOT NULL,
    chapter_number INTEGER NOT NULL,
    chapter_title  TEXT,
    description    TEXT,
    cover_image    TEXT,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
";

pub struct DbState {
    path: Mutex<PathBuf>,
    conn: Mutex<Connection>,
    book_covers_dir: PathBuf,
    chapter_covers_dir: PathBuf,
}

impl DbState {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let app_dir = db_path
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| PathBuf::from("."));

        if !app_dir.exists() {
            std::fs::create_dir_all(&app_dir).map_err(|e| {
                rusqlite::Error::InvalidPath(format!("criar diretório: {e}").into())
            })?;
        }

        let book_covers_dir = app_dir.join("covers");
        let chapter_covers_dir = book_covers_dir.join("chapters");
        std::fs::create_dir_all(&book_covers_dir).map_err(|e| {
            rusqlite::Error::InvalidPath(format!("criar diretório de capas: {e}").into())
        })?;
        std::fs::create_dir_all(&chapter_covers_dir).map_err(|e| {
            rusqlite::Error::InvalidPath(format!("criar diretório de capas de capítulos: {e}").into())
        })?;

        let conn = Connection::open(&db_path)?;
        conn.execute_batch(SCHEMA)?;
        migrate(&conn)?;

        Ok(Self {
            path: Mutex::new(db_path),
            conn: Mutex::new(conn),
            book_covers_dir,
            chapter_covers_dir,
        })
    }

    pub fn db_path(&self) -> PathBuf {
        self.path.lock().expect("db path lock").clone()
    }

    pub fn book_covers_dir(&self) -> PathBuf {
        self.book_covers_dir.clone()
    }

    pub fn chapter_covers_dir(&self) -> PathBuf {
        self.chapter_covers_dir.clone()
    }

    pub fn with_conn<F, T>(&self, f: F) -> Result<T>
    where
        F: FnOnce(&Connection) -> Result<T>,
    {
        let conn = self.conn.lock().expect("db conn lock");
        f(&conn)
    }

    pub fn reconnect(&self) -> Result<()> {
        let path = self.db_path();
        let new_conn = Connection::open(&path)?;
        new_conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        migrate(&new_conn)?;
        *self.conn.lock().expect("db conn lock") = new_conn;
        Ok(())
    }
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let exists = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(Result::ok)
        .any(|name| name == column);
    Ok(exists)
}

fn migrate(conn: &Connection) -> Result<()> {
    if !column_exists(conn, "books", "cover_image")? {
        conn.execute("ALTER TABLE books ADD COLUMN cover_image TEXT", [])?;
    }

    if !column_exists(conn, "books", "sort_order")? {
        conn.execute(
            "ALTER TABLE books ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
        conn.execute("UPDATE books SET sort_order = id", [])?;
    }

    if !column_exists(conn, "chapters", "description")? {
        conn.execute("ALTER TABLE chapters ADD COLUMN description TEXT", [])?;
    }

    if !column_exists(conn, "chapters", "cover_image")? {
        conn.execute("ALTER TABLE chapters ADD COLUMN cover_image TEXT", [])?;
    }

    Ok(())
}

pub fn validate_backup_db(path: &Path) -> Result<(), String> {
    let conn = Connection::open(path).map_err(|e| format!("Arquivo inválido: {e}"))?;

    let books_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='books'",
            [],
            |row| row.get::<_, i32>(0),
        )
        .map(|c| c > 0)
        .map_err(|e| e.to_string())?;

    let chapters_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='chapters'",
            [],
            |row| row.get::<_, i32>(0),
        )
        .map(|c| c > 0)
        .map_err(|e| e.to_string())?;

    if !books_exists || !chapters_exists {
        return Err(
            "Backup inválido: o arquivo não contém as tabelas esperadas (books, chapters)."
                .to_string(),
        );
    }

    Ok(())
}

pub fn backup_filename() -> String {
    let now = chrono::Local::now().format("%Y%m%d_%H%M%S");
    format!("catalogo-livros-backup-{now}.db")
}

pub fn cover_path(covers_dir: &Path, cover_image: &Option<String>) -> Option<String> {
    let filename = cover_image.as_ref()?;
    let path = covers_dir.join(filename);
    if path.exists() {
        Some(path.to_string_lossy().to_string())
    } else {
        None
    }
}

pub fn delete_cover_file(covers_dir: &Path, cover_image: &Option<String>) {
    if let Some(filename) = cover_image {
        let path = covers_dir.join(filename);
        let _ = std::fs::remove_file(path);
    }
}
