import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbDir = process.env.USER_DATA_PATH ?? join(__dirname, '..')
const db = new DatabaseSync(join(dbDir, 'chores.db'))

db.exec("PRAGMA journal_mode = WAL")
db.exec("PRAGMA foreign_keys = ON")

db.exec(`
  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    assignee_id INTEGER REFERENCES team_members(id) ON DELETE SET NULL,
    start_date TEXT NOT NULL,
    recurrence_type TEXT NOT NULL DEFAULT 'none',
    recurrence_days TEXT,
    recurrence_interval INTEGER,
    recurrence_end_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chore_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chore_id INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    occurrence_date TEXT NOT NULL,
    completed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(chore_id, occurrence_date)
  );
`)

// Migrations — safe to run every startup (SQLite throws on duplicate column, we ignore)
try { db.exec("ALTER TABLE chores ADD COLUMN is_incentive INTEGER DEFAULT 0") } catch (_) {}
try { db.exec("ALTER TABLE chores ADD COLUMN recurrence_weekday INTEGER") } catch (_) {}
try { db.exec("ALTER TABLE chores ADD COLUMN recurrence_week INTEGER") } catch (_) {}

export default db
