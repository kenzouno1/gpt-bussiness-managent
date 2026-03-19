# Phase 4: Frontend UI

## Context Links
- [Plan Overview](plan.md)
- [Phase 3: Backend API](phase-03-backend-api.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Build Bootstrap 5 admin UI pages for accounts and organizations management.

## Requirements
- Responsive layout with sidebar nav
- Accounts list page with search/filter
- Account detail modal or page
- Org list page with member count
- Org detail page showing members
- CSV upload form with drag-and-drop
- Real-time TOTP display (see Phase 6)

## Architecture

### Pages
1. **index.html** - Accounts list + import CSV button
2. **orgs.html** - Organizations list + org detail view

### Layout
- Bootstrap 5 via CDN (no build step)
- Shared navbar with links to Accounts / Orgs
- DataTables-style search via simple JS filter (no extra lib)

### JS Files
- `app.js` - Shared: API base URL, fetch wrapper, toast notifications
- `accounts.js` - Load accounts table, CRUD modals, CSV upload, TOTP display
- `orgs.js` - Load orgs table, member list, invite modal

## Implementation Steps

1. Create `src/public/index.html`:
   - Bootstrap 5 CDN + custom CSS link
   - Navbar with Accounts (active) / Orgs links
   - "Import CSV" button opening file upload modal
   - Accounts table: Email, Status, Plan, Created, Actions (view/edit/delete)
   - Account detail modal: all fields + live TOTP code
   - Edit modal: form with editable fields

2. Create `src/public/orgs.html`:
   - Same navbar
   - Orgs table: Name, Plan, Members Count, Actions
   - Org detail view: member list table
   - Invite modal: multiselect accounts not yet in org, "Invite Selected" button

3. Create `src/public/css/styles.css`:
   - Minimal overrides (table row hover, modal sizing, TOTP code styling)

4. Create `src/public/js/app.js`:
   - `const API = '/api'`
   - `async function apiFetch(path, opts)` - wrapper with error handling
   - Toast notification helper using Bootstrap toast

5. Create `src/public/js/accounts.js`:
   - `loadAccounts()` - fetch + render table
   - `showAccountDetail(id)` - fetch + populate modal
   - `editAccount(id)` - populate edit form, PUT on save
   - `deleteAccount(id)` - confirm + DELETE
   - `uploadCSV(file)` - FormData POST to /api/accounts/import
   - `startTotpRefresh(id)` - poll TOTP endpoint every 30s

6. Create `src/public/js/orgs.js`:
   - `loadOrgs()` - fetch + render table with member count
   - `showOrgDetail(id)` - fetch members, render list
   - `inviteToOrg(orgId, accountIds)` - POST invite

## Related Code Files
- **Create:** `src/public/index.html`, `src/public/orgs.html`
- **Create:** `src/public/css/styles.css`
- **Create:** `src/public/js/app.js`, `src/public/js/accounts.js`, `src/public/js/orgs.js`

## Todo List
- [ ] index.html with accounts table
- [ ] orgs.html with orgs table
- [ ] app.js shared utilities
- [ ] accounts.js full CRUD + CSV upload
- [ ] orgs.js with member list + invite
- [ ] styles.css minimal overrides
- [ ] Test full flow: import CSV, view accounts, view orgs

## Success Criteria
- Pages load with Bootstrap styling
- Accounts table populates from API
- CSV upload triggers import and refreshes table
- Org detail shows correct member list
- Modals open/close cleanly, forms validate
