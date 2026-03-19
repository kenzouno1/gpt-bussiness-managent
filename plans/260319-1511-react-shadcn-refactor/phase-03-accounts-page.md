# Phase 3: Accounts Page

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2.5h
- **Depends on:** Phase 2

Implement Accounts page: DataTable with search, CSV import dialog, account detail sheet, real-time TOTP display.

## Key Insights
- Current TOTP: `setInterval(1000)` per account row + separate interval in modal
- ~15 account fields in DB; table shows 7 columns, detail modal shows all
- CSV import uses `multipart/form-data` upload
- TOTP response: `{ code: "123456", secondsRemaining: 18 }`

## Requirements

### Functional
- DataTable listing accounts (ID, Email, Status, Plan, 2FA Code, Org ID, Created)
- Column sorting, global search/filter
- Real-time TOTP codes in table rows (1s polling)
- CSV Import: dialog with file picker, submit, show results (imported/skipped/errors)
- Account Detail: Sheet/Dialog showing all fields, real-time 2FA with countdown
- Delete account with confirmation
- Copy-to-clipboard for secrets/tokens

### Non-Functional
- TOTP polling cleanup on unmount (no memory leaks)
- Table performant with 100+ accounts

## Architecture

```
client/src/
  pages/
    accounts-page.jsx          # Page container, data fetching
  components/
    accounts/
      accounts-data-table.jsx  # TanStack Table + shadcn DataTable
      accounts-columns.jsx     # Column definitions
      csv-import-dialog.jsx    # Import dialog
      account-detail-sheet.jsx # Detail view (Sheet or Dialog)
      totp-display.jsx         # Single TOTP code + timer
  hooks/
    use-totp.js                # Custom hook: polls /api/accounts/:id/totp
```

## Related Code Files
- **Create:** all files above
- **Reference:** `src/public/js/accounts.js` (port logic), `src/public/index.html` (UI structure)
- **shadcn add:** `table dialog sheet input badge card tabs`

## Implementation Steps

1. Install TanStack Table: `npm install @tanstack/react-table`
2. Add shadcn components: `npx shadcn@latest add table dialog sheet input badge card`
3. Create `hooks/use-totp.js`:
   ```js
   function useTotp(accountId, enabled = true) {
     // useState for { code, secondsRemaining }
     // useEffect: if enabled, fetch /api/accounts/{id}/totp every 1s
     // cleanup: clearInterval on unmount or when accountId changes
     // return { code, secondsRemaining }
   }
   ```
4. Create `components/accounts/totp-display.jsx`:
   - Accepts `accountId` prop
   - Uses `useTotp(accountId)`
   - Renders code in monospace Badge + seconds remaining
   - Optional: circular countdown ring using SVG (nice-to-have)
5. Create `components/accounts/accounts-columns.jsx`:
   - Define TanStack column defs: id, email (clickable), status (Badge), plan, TOTP (`<TotpDisplay>`), orgId, created, actions (delete btn)
   - Email column: onClick opens detail sheet
6. Create `components/accounts/accounts-data-table.jsx`:
   - Follow shadcn DataTable pattern
   - Props: `data`, `columns`
   - Features: global filter (search input above table), column sorting
   - Render using shadcn `<Table>` components
7. Create `components/accounts/csv-import-dialog.jsx`:
   - Dialog with file input + submit button
   - On submit: `api.upload('/api/import', file)`
   - Show results (imported/skipped/orgsCreated/errors)
   - On success: call `onImported` callback to refresh table
8. Create `components/accounts/account-detail-sheet.jsx`:
   - Sheet (slide-in panel) showing all account fields
   - Props: `accountId`, `open`, `onOpenChange`
   - Fetch full account data on open: `api.get(/api/accounts/{id})`
   - Real-time TOTP display using `useTotp(accountId, open)`
   - Password field with show/hide toggle
   - Copy buttons for totp_secret, session_token
9. Create `pages/accounts-page.jsx`:
   - Fetch accounts on mount: `api.get('/api/accounts')`
   - State: accounts[], selectedAccountId, importDialogOpen
   - Render: import button + `<CsvImportDialog>`, `<AccountsDataTable>`, `<AccountDetailSheet>`
   - Delete handler: confirm dialog, `api.del()`, refresh
10. Wire `accounts-page.jsx` into router (already done in Phase 2)

## Todo
- [ ] Create `useTotp` hook
- [ ] Create `TotpDisplay` component
- [ ] Create column definitions
- [ ] Build DataTable with search/sort
- [ ] Build CSV import dialog
- [ ] Build account detail sheet
- [ ] Wire up accounts page
- [ ] Test TOTP polling starts/stops correctly

## Success Criteria
- Account table renders with all columns, searchable
- TOTP codes update every second in table rows
- CSV import dialog uploads file, shows results, refreshes table
- Account detail sheet shows all fields + live TOTP
- TOTP intervals cleaned up on unmount/navigation
- Delete works with confirmation

## Risk Assessment
- **TOTP polling 100+ accounts** -- each row polls independently; acceptable for <200 accounts. If perf issue, batch endpoint could be added later (YAGNI for now)
- **TanStack Table complexity** -- follow shadcn DataTable recipe exactly to avoid custom wiring

## Security Considerations
- Password field hidden by default (show/hide toggle)
- Session tokens truncated in display, full value only on copy
