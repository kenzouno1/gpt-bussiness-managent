CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  hotmail_email TEXT,
  hotmail_id TEXT,
  hotmail_session TEXT,
  hotmail_uuid TEXT,
  totp_secret TEXT,
  session_token TEXT,
  chatgpt_account_id TEXT,
  chatgpt_user_id TEXT,
  chatgpt_plan_type TEXT,
  created_at TEXT,
  imported_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chatgpt_account_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  plan_type TEXT,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  last_synced TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS org_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  role TEXT DEFAULT 'member',
  invited_at TEXT,
  invite_status TEXT DEFAULT 'pending',
  UNIQUE(org_id, account_id)
);

-- Account token status columns (added via ALTER for existing DBs)
-- token_status: unchecked | valid | invalid | error
-- token_checked_at: last check timestamp

CREATE INDEX IF NOT EXISTS idx_accounts_chatgpt_account_id ON accounts(chatgpt_account_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_account_id ON org_members(account_id);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
