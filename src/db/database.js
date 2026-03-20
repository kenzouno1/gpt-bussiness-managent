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

// Migrate org_members: CASCADE → RESTRICT (existing DBs)
const fkInfo = db.prepare("PRAGMA foreign_key_list(org_members)").all();
const hasCascade = fkInfo.some(fk => fk.on_delete === 'CASCADE');
if (hasCascade) {
  db.pragma('foreign_keys = OFF');
  db.exec(`
    CREATE TABLE org_members_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      role TEXT DEFAULT 'member',
      invited_at TEXT,
      invite_status TEXT DEFAULT 'pending',
      UNIQUE(org_id, account_id)
    );
    INSERT INTO org_members_new SELECT * FROM org_members;
    DROP TABLE org_members;
    ALTER TABLE org_members_new RENAME TO org_members;
    CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_account_id ON org_members(account_id);
  `);
  db.pragma('foreign_keys = ON');
}

// Add columns if they don't exist (safe for existing DBs)
const accountCols = db.prepare("PRAGMA table_info(accounts)").all().map(c => c.name);
if (!accountCols.includes('token_status')) {
  db.exec("ALTER TABLE accounts ADD COLUMN token_status TEXT DEFAULT 'unchecked'");
}
if (!accountCols.includes('token_checked_at')) {
  db.exec("ALTER TABLE accounts ADD COLUMN token_checked_at TEXT");
}

module.exports = db;
