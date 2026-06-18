import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Cache the connection on globalThis so Next.js dev-mode hot reloads reuse it
// instead of opening a new handle per module evaluation.
const globalForDb = globalThis as unknown as { __db?: Database.Database };

function init(): Database.Database {
  // DB_DIR lets a deploy point the database at a mounted persistent volume.
  const dataDir = process.env.DB_DIR ?? path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "university.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🎓',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, slug)
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '📚',
      description TEXT NOT NULL DEFAULT '',
      objective TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (school_id, slug)
    );

    CREATE TABLE IF NOT EXISTS lectures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'cards',
      position INTEGER NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      options TEXT NOT NULL,
      answer_index INTEGER NOT NULL,
      explanation TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS lecture_progress (
      lecture_id INTEGER PRIMARY KEY REFERENCES lectures(id) ON DELETE CASCADE,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS test_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      detail TEXT NOT NULL DEFAULT '[]',
      taken_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add classes.objective to DBs created before it existed.
  const classCols = db.prepare("PRAGMA table_info(classes)").all() as {
    name: string;
  }[];
  if (!classCols.some((c) => c.name === "objective")) {
    db.exec("ALTER TABLE classes ADD COLUMN objective TEXT NOT NULL DEFAULT ''");
  }

  // Migration: add schools.user_id to DBs created before multi-user support.
  // (The old single-tenant DB has a global UNIQUE on slug we can't drop via
  // ALTER; that's harmless — slug is never read, and createSchool dedupes
  // per-user with a suffix fallback.) Pre-existing schools are left NULL-owned
  // and claimed by OWNER_EMAIL on login (see getOrCreateUser in data.ts).
  const schoolCols = db.prepare("PRAGMA table_info(schools)").all() as {
    name: string;
  }[];
  if (!schoolCols.some((c) => c.name === "user_id")) {
    db.exec("ALTER TABLE schools ADD COLUMN user_id INTEGER REFERENCES users(id)");
  }

  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.__db) globalForDb.__db = init();
  return globalForDb.__db;
}
