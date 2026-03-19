# Phase 2: Database Schema

## Context Links
- [Plan Overview](plan.md)
- [Phase 1: Setup](phase-01-project-setup.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Design and implement SQLite schema for accounts, organizations, and org members.

## Key Insights
- JWT payload contains `chatgpt_account_id` (= org ID), `chatgpt_plan_type`, `chatgpt_user_id`, `email`
- Each account has exactly one org derived from its JWT at import time
- Hotmail field is pipe-separated: `email|id|session_token|uuid`
- 2FA field is a base32 TOTP secret

## Architecture

### Tables

**accounts**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoincrement |
| email | TEXT UNIQUE | login email |
| password | TEXT | login password |
| status | TEXT | from CSV (e.g. "stripe_link") |
| payment_link_1 | TEXT | nullable |
| payment_link_2 | TEXT | nullable |
| hotmail_email | TEXT | parsed from pipe-separated field |
| hotmail_id | TEXT | parsed |
| hotmail_session | TEXT | parsed |
| hotmail_uuid | TEXT | parsed |
| totp_secret | TEXT | base32 secret for 2FA |
| session_token | TEXT | JWT access token |
| chatgpt_account_id | TEXT | decoded from JWT |
| chatgpt_user_id | TEXT | decoded from JWT |
| chatgpt_plan_type | TEXT | decoded from JWT |
| created_at | TEXT | from CSV |
| imported_at | TEXT | DEFAULT CURRENT_TIMESTAMP |

**organizations**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoincrement |
| chatgpt_account_id | TEXT UNIQUE | org identifier from JWT |
| name | TEXT | "email - chatgpt_account_id" |
| plan_type | TEXT | from JWT |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP |

**org_members**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoincrement |
| org_id | INTEGER FK | references organizations.id |
| account_id | INTEGER FK | references accounts.id |
| role | TEXT | DEFAULT 'member' |
| invited_at | TEXT | nullable, set when invite sent |
| invite_status | TEXT | 'pending'/'sent'/'failed'/'joined' |

## Implementation Steps

1. Create `src/db/schema.sql` with CREATE TABLE IF NOT EXISTS statements
2. Create `src/db/database.js`:
   - Init better-sqlite3 connection to `data/gpt-team.db`
   - `mkdir -p data/` on startup
   - Read and exec schema.sql on init
   - Export db instance + helper functions
3. Add indexes:
   - `accounts(email)` UNIQUE
   - `accounts(chatgpt_account_id)`
   - `organizations(chatgpt_account_id)` UNIQUE
   - `org_members(org_id, account_id)` UNIQUE

## Related Code Files
- **Create:** `src/db/schema.sql`, `src/db/database.js`
- **Create:** `data/` directory (gitignored)

## Todo List
- [ ] Write schema.sql with all 3 tables
- [ ] Write database.js with init logic
- [ ] Add indexes
- [ ] Test: import database.js, verify tables created

## Success Criteria
- `require('./db/database')` creates DB file and all tables
- Schema matches column spec above
- Unique constraints prevent duplicate accounts/orgs
