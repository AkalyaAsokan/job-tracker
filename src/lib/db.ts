import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'jobs.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    url TEXT NOT NULL,
    posted_at TEXT,
    fetched_at TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    source TEXT DEFAULT 'unknown',
    notes TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS refresh_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    refreshed_at TEXT NOT NULL,
    jobs_found INTEGER DEFAULT 0,
    jobs_new INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_fetched ON jobs(fetched_at DESC);
`);

// Migrate: add columns if they don't exist yet (for existing DBs)
const cols = (db.prepare(`PRAGMA table_info(jobs)`).all() as Array<{name: string}>).map(c => c.name);
if (!cols.includes('source')) db.exec(`ALTER TABLE jobs ADD COLUMN source TEXT DEFAULT 'unknown'`);
if (!cols.includes('notes')) db.exec(`ALTER TABLE jobs ADD COLUMN notes TEXT DEFAULT ''`);

export default db;

export interface Job {
  id: string;
  company_id: string;
  company_name: string;
  title: string;
  location: string | null;
  url: string;
  posted_at: string | null;
  fetched_at: string;
  status: 'new' | 'saved' | 'applied' | 'dismissed';
  source: string;
  notes: string;
}
