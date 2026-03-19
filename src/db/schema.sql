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
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  invited_at TEXT,
  invite_status TEXT DEFAULT 'pending',
  UNIQUE(org_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_chatgpt_account_id ON accounts(chatgpt_account_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_account_id ON org_members(account_id);
