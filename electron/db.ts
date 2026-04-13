import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

const DB_PATH = process.env.NODE_ENV === 'development'
  ? path.join(process.cwd(), 'study-companion.db')
  : path.join(app.getPath('userData'), 'study-companion.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initTables(db)
  }
  return db
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📖',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      title TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'text',
      source_content TEXT,
      start_date DATE,
      end_date DATE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      date DATE NOT NULL,
      tasks TEXT DEFAULT '[]',
      link_ids TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      summary TEXT DEFAULT NULL,
      completed_at DATETIME DEFAULT NULL,
      study_duration INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plans(id),
      UNIQUE(plan_id, date)
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT,
      source TEXT,
      feedback TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      completion_rate REAL DEFAULT 0,
      subject_duration TEXT DEFAULT '{}',
      achievements TEXT DEFAULT '[]',
      next_week_plan TEXT DEFAULT '',
      ai_advice TEXT DEFAULT '',
      raw_text TEXT DEFAULT '',
      exported_as TEXT DEFAULT '[]',
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
