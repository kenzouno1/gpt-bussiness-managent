# Phase 5: CSV Import

## Context Links
- [Plan Overview](plan.md)
- [Phase 2: Database](phase-02-database-schema.md)
- [Phase 3: Backend API](phase-03-backend-api.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Parse uploaded CSV, decode JWT tokens, create accounts and auto-create organizations.

## Key Insights
- CSV has BOM (`\uFEFF`) prefix -- must strip before parsing
- Hotmail column: pipe-separated `email|id|session_token|uuid`
- Session column: full JWT -- decode payload (no verify) to extract org info
- JWT payload path: `https://api.openai.com/auth` → `chatgpt_account_id`, `chatgpt_plan_type`, `chatgpt_user_id`
- If `chatgpt_account_id` already in orgs table, skip org creation
- If account email already in accounts table, skip (or update)

## Architecture

### Import Flow
```
CSV Upload → Parse (papaparse) → For each row:
  1. Parse hotmail field (split on |)
  2. Decode JWT session (jsonwebtoken.decode)
  3. Extract chatgpt_account_id, plan_type, user_id
  4. UPSERT account row
  5. Check if org exists by chatgpt_account_id
     → No: INSERT org with name = "email - chatgpt_account_id"
     → Yes: skip
  6. UPSERT org_member link (account ↔ org)
```

### Service: `src/services/csv-import-service.js`
- `importFromCSV(fileBuffer)` → `{ imported: N, skipped: N, errors: [...] }`
- Uses transaction for atomicity
- Returns summary with per-row errors

## Implementation Steps

1. Create `src/services/csv-import-service.js`:
   - Strip BOM from buffer string
   - Parse with papaparse: `Papa.parse(csvString, { header: true, skipEmptyLines: true })`
   - For each row:
     a. Validate required fields (email, password, 2FA, session)
     b. Parse hotmail: `const [hEmail, hId, hSession, hUuid] = row.Hotmail.split('|')`
     c. Decode JWT: `jwt.decode(row.Session)` → extract from `['https://api.openai.com/auth']`
     d. INSERT OR IGNORE into accounts
     e. INSERT OR IGNORE into organizations
     f. INSERT OR IGNORE into org_members
   - Wrap all inserts in `db.transaction()`
   - Collect errors per row, return summary

2. Wire into `src/routes/import-routes.js`:
   - multer memory storage (single file, field name 'csv')
   - Call `importFromCSV(req.file.buffer)`
   - Return `{ success: true, data: { imported, skipped, errors } }`

## Related Code Files
- **Create:** `src/services/csv-import-service.js`
- **Modify:** `src/routes/import-routes.js`

## Todo List
- [ ] CSV parsing with BOM handling
- [ ] Hotmail field parsing
- [ ] JWT decode + claim extraction
- [ ] Account upsert logic
- [ ] Org auto-creation logic
- [ ] Org member linking
- [ ] Transaction wrapping
- [ ] Error collection + summary response
- [ ] Test with actual CSV file

## Success Criteria
- Import 25-row CSV → 25 accounts created
- Orgs auto-created from unique chatgpt_account_ids
- Duplicate imports are idempotent (no errors, counts as skipped)
- BOM-prefixed CSV handled correctly
- Malformed rows reported in errors array, don't block other rows

## Risk Assessment
- **JWT expiry:** Tokens may be expired -- we only decode, never verify, so this is fine
- **Hotmail field format:** If a row has fewer than 4 pipe segments, log error, store what's available
- **Large CSV:** 25 rows is trivial; no streaming needed
