import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, copyFileSync } from 'fs'

let db: Database.Database | null = null

function getResourcePath(filename: string): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, filename)
  }
  return join(__dirname, '../../resources', filename)
}

function getUserDbPath(): string {
  const userDataPath = app.isPackaged
    ? app.getPath('userData')
    : join(app.getPath('appData'), 'hanzi-learn')
  return join(userDataPath, 'hanzi-learn.db')
}

export function initDatabase(): void {
  const userDbPath = getUserDbPath()
  const sourceDbPath = getResourcePath('hanzi.db')

  if (!existsSync(userDbPath)) {
    if (existsSync(sourceDbPath)) {
      copyFileSync(sourceDbPath, userDbPath)
    } else {
      db = new Database(userDbPath)
      createTables(db)
      db.pragma('journal_mode = WAL')
      db.pragma('foreign_keys = ON')
      return
    }
  }

  db = new Database(userDbPath)
  runMigrations(db)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
}

function runMigrations(database: Database.Database): void {
  try {
    database.exec('ALTER TABLE user_characters ADD COLUMN is_known INTEGER DEFAULT 0')
  } catch {
    // Column already exists
  }
  try {
    database.exec(`CREATE TABLE IF NOT EXISTS user_sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER REFERENCES characters(id),
      sentence TEXT NOT NULL,
      pinyin TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  } catch {
    // Table already exists
  }
  try {
    database.exec('CREATE INDEX IF NOT EXISTS idx_us_char ON user_sentences(character_id)')
  } catch {
    // Index already exists
  }
}

function createTables(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS radicals (
      id INTEGER PRIMARY KEY,
      radical TEXT NOT NULL,
      name TEXT,
      pinyin TEXT,
      stroke_count INTEGER,
      meaning TEXT,
      variants TEXT
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character TEXT NOT NULL UNIQUE,
      unicode_hex TEXT NOT NULL,
      pinyin TEXT NOT NULL,
      pinyin_num TEXT,
      radical_id INTEGER REFERENCES radicals(id),
      stroke_count INTEGER NOT NULL DEFAULT 0,
      structure TEXT,
      frequency INTEGER,
      definition TEXT,
      decomposition TEXT,
      stroke_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_char_radical ON characters(radical_id);
    CREATE INDEX IF NOT EXISTS idx_char_freq ON characters(frequency);
    CREATE INDEX IF NOT EXISTS idx_char_strokes ON characters(stroke_count);
    CREATE INDEX IF NOT EXISTS idx_char_structure ON characters(structure);
    CREATE INDEX IF NOT EXISTS idx_char_pinyin ON characters(pinyin);

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      pinyin TEXT NOT NULL,
      definition TEXT NOT NULL,
      frequency INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_word ON words(word);

    CREATE TABLE IF NOT EXISTS character_words (
      character_id INTEGER REFERENCES characters(id),
      word_id INTEGER REFERENCES words(id),
      PRIMARY KEY (character_id, word_id)
    );

    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sentence TEXT NOT NULL,
      pinyin TEXT,
      translation TEXT,
      source TEXT,
      difficulty INTEGER
    );

    CREATE TABLE IF NOT EXISTS character_sentences (
      character_id INTEGER REFERENCES characters(id),
      sentence_id INTEGER REFERENCES sentences(id),
      PRIMARY KEY (character_id, sentence_id)
    );

    CREATE TABLE IF NOT EXISTS user_characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER REFERENCES characters(id),
      added_at TEXT DEFAULT (datetime('now')),
      familiarity INTEGER DEFAULT 0,
      next_review TEXT DEFAULT (datetime('now')),
      review_count INTEGER DEFAULT 0,
      notes TEXT,
      UNIQUE(character_id)
    );

    CREATE INDEX IF NOT EXISTS idx_uc_review ON user_characters(next_review);
    CREATE INDEX IF NOT EXISTS idx_uc_familiarity ON user_characters(familiarity);

    CREATE TABLE IF NOT EXISTS review_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_char_id INTEGER REFERENCES user_characters(id),
      reviewed_at TEXT DEFAULT (datetime('now')),
      rating INTEGER,
      time_spent_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS character_similarity (
      character_id INTEGER REFERENCES characters(id),
      similar_id INTEGER REFERENCES characters(id),
      score REAL,
      PRIMARY KEY (character_id, similar_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sim ON character_similarity(character_id, score DESC);

    CREATE TABLE IF NOT EXISTS user_sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER REFERENCES characters(id),
      sentence TEXT NOT NULL,
      pinyin TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_us_char ON user_sentences(character_id);
  `)
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}
