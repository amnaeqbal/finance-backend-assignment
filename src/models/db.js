const Database = require('better-sqlite3');
const path = require('path');

// using better-sqlite3 because it's synchronous — no callback hell for simple queries
// the db file sits in project root, gets created automatically if it doesn't exist
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'finance.db');
const db = new Database(dbPath);

// enable foreign keys — sqlite has them off by default which is surprising
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer', 'analyst', 'admin')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
    CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
    CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
  `);
}

module.exports = { db, initDB };
