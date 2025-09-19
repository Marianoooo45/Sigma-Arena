// lib/db.ts
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "rev-market.db");
const db = new Database(DB_PATH);

// --- SCHEMA ---
db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER NULL,
  name TEXT UNIQUE,
  target_weight REAL DEFAULT 0.0,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(parent_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  category_id INTEGER,
  type TEXT,               -- MCQ | short | calc
  prompt TEXT NOT NULL,
  choices TEXT NULL,       -- JSON array
  answer TEXT NOT NULL,    -- JSON (index or text)
  difficulty REAL DEFAULT 0.5,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS mastery (
  category_id INTEGER PRIMARY KEY,
  rating REAL DEFAULT 50.0,
  rating_var REAL DEFAULT 50.0,
  last_reviewed TEXT NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS activity_rollup (
  category_id INTEGER PRIMARY KEY,
  ema_activity REAL DEFAULT 0.0,
  ema_perf REAL DEFAULT 0.5,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  started_at TEXT,
  ended_at TEXT NULL,
  te_before REAL,
  te_after REAL,
  nav_before REAL,
  nav_after REAL,
  pnl REAL
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY,
  session_id INTEGER,
  question_id INTEGER,
  category_id INTEGER,
  correct INTEGER,
  time_sec INTEGER,
  rating_delta REAL,
  FOREIGN KEY(session_id) REFERENCES sessions(id),
  FOREIGN KEY(question_id) REFERENCES questions(id),
  FOREIGN KEY(category_id) REFERENCES categories(id)
);
`);

export default db;

// Helpers insert-if-missing
export function ensureMasteryAndActivity(categoryId: number) {
  db.prepare(`
    INSERT OR IGNORE INTO mastery(category_id) VALUES (?)
  `).run(categoryId);
  db.prepare(`
    INSERT OR IGNORE INTO activity_rollup(category_id) VALUES (?)
  `).run(categoryId);
}

export function tx<T>(f: () => T): T {
  const t = db.transaction(f);
  return t();
}
