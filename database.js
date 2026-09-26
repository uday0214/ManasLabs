const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'nexora.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable WAL mode for high performance
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    institution TEXT,
    role TEXT DEFAULT 'researcher',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    config TEXT DEFAULT '{}',
    share_slug TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS experiment_blocks (
    id TEXT PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    block_type TEXT NOT NULL,
    block_data TEXT NOT NULL,
    sequence_order INTEGER NOT NULL,
    parent_block_id TEXT,
    FOREIGN KEY(experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    participant_token TEXT UNIQUE NOT NULL,
    screen_refresh_rate REAL,
    user_agent TEXT,
    viewport_resolution TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status TEXT DEFAULT 'in_progress',
    completion_code TEXT,
    FOREIGN KEY(experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS trial_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    trial_number INTEGER NOT NULL,
    condition_name TEXT NOT NULL,
    stimulus_presented TEXT,
    stimulus_onset_time REAL NOT NULL,
    key_pressed TEXT,
    response_time_ms REAL NOT NULL,
    is_correct INTEGER NOT NULL,
    custom_telemetry TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_trials_session ON trial_records(session_id);
  CREATE INDEX IF NOT EXISTS idx_trials_condition ON trial_records(condition_name);

  CREATE TABLE IF NOT EXISTS dummy_datasets (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    experiment_type TEXT NOT NULL,
    participant_count INTEGER NOT NULL,
    dataset_payload TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration helpers for student / participant portal
function addColumnIfNotExists(table, column, colDef) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!info.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${colDef};`);
  }
}

addColumnIfNotExists('users', 'participant_id', 'TEXT');
addColumnIfNotExists('users', 'age', 'INTEGER');
addColumnIfNotExists('users', 'gender', 'TEXT');
addColumnIfNotExists('users', 'handedness', 'TEXT DEFAULT "right"');
addColumnIfNotExists('users', 'vision_correction', 'TEXT DEFAULT "normal"');

addColumnIfNotExists('sessions', 'user_id', 'TEXT');
addColumnIfNotExists('sessions', 'score_accuracy', 'REAL');
addColumnIfNotExists('sessions', 'mean_rt_ms', 'REAL');

console.log('[Database] Schema initialized and student migrations applied successfully.');

module.exports = db;
