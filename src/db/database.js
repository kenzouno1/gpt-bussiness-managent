const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'gpt-team.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema migration
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Add columns if they don't exist (safe for existing DBs)
const accountCols = db.prepare("PRAGMA table_info(accounts)").all().map(c => c.name);
if (!accountCols.includes('token_status')) {
  db.exec("ALTER TABLE accounts ADD COLUMN token_status TEXT DEFAULT 'unchecked'");
}
if (!accountCols.includes('token_checked_at')) {
  db.exec("ALTER TABLE accounts ADD COLUMN token_checked_at TEXT");
}

module.exports = db;
