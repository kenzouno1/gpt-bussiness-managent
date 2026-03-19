# Phase 3: Backend API

## Context Links
- [Plan Overview](plan.md)
- [Phase 2: Database](phase-02-database-schema.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Implement Express REST API routes for accounts and organizations CRUD.

## Requirements
- Standard REST endpoints returning JSON
- Proper error handling with status codes
- Input validation on write endpoints
- Pagination not needed (max ~100 accounts)

## Architecture

### Endpoints

**Account Routes** (`src/routes/account-routes.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/accounts | List all accounts (summary fields) |
| GET | /api/accounts/:id | Full account detail |
| PUT | /api/accounts/:id | Update account fields |
| DELETE | /api/accounts/:id | Delete account + org_member links |
| GET | /api/accounts/:id/totp | Get current TOTP code + seconds remaining |

**Org Routes** (`src/routes/org-routes.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/orgs | List orgs with member count |
| GET | /api/orgs/:id | Org detail + members list |
| GET | /api/orgs/:id/members | Members of org |
| POST | /api/orgs/:id/invite | Bulk invite accounts to org |

**Import Routes** (`src/routes/import-routes.js`)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/accounts/import | Upload CSV, parse, import |

### Response Format
```json
{ "success": true, "data": {...} }
{ "success": false, "error": "message" }
```

## Implementation Steps

1. Create `src/routes/account-routes.js`:
   - GET /api/accounts: `SELECT id, email, status, chatgpt_plan_type, created_at FROM accounts`
   - GET /api/accounts/:id: `SELECT * FROM accounts WHERE id = ?`
   - PUT /api/accounts/:id: Whitelist updatable fields, UPDATE
   - DELETE /api/accounts/:id: DELETE from org_members first, then accounts
   - GET /api/accounts/:id/totp: Fetch totp_secret, generate code via totp-service

2. Create `src/routes/org-routes.js`:
   - GET /api/orgs: JOIN with COUNT of org_members
   - GET /api/orgs/:id: Org row + members array
   - GET /api/orgs/:id/members: JOIN accounts via org_members
   - POST /api/orgs/:id/invite: Accept `{ account_ids: [1,2,3] }`, delegate to chatgpt-api-client

3. Create `src/routes/import-routes.js`:
   - POST /api/accounts/import: multer file upload, delegate to csv-import-service

4. Mount all routes in `src/server.js`

5. Add error-handling middleware (catch-all 500)

## Related Code Files
- **Create:** `src/routes/account-routes.js`, `src/routes/org-routes.js`, `src/routes/import-routes.js`
- **Modify:** `src/server.js` (mount routes)

## Todo List
- [ ] Account CRUD routes
- [ ] TOTP endpoint
- [ ] Org routes with member count
- [ ] Import route (file upload)
- [ ] Invite route (stub)
- [ ] Error handling middleware
- [ ] Test all endpoints with curl/Postman

## Success Criteria
- All endpoints return correct JSON shape
- GET /api/accounts returns list after CSV import
- GET /api/accounts/:id/totp returns valid 6-digit code
- DELETE cascades to org_members
- 404 for missing resources, 400 for bad input
