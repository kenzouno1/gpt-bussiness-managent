# Phase 4: Organizations Page

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2h
- **Depends on:** Phase 2 (can run parallel with Phase 3)

Implement Orgs page: DataTable, org detail dialog with member list, auto-invite functionality.

## Key Insights
- Org list includes computed `member_count` from JOIN
- Org detail fetches members with email, role, invite_status
- Auto-invite: POST `/api/orgs/:id/invite` with empty body invites all non-member accounts
- Invite is async and can take time per account (serial on backend)
- Status colors: pending=warning, sent=primary, joined=success, failed=danger

## Requirements

### Functional
- DataTable: ID, Name, Org Account ID, Plan, Members (count badge), Created, Actions
- Column sorting, global search
- Org Detail Dialog: org info + member table (email, role, status badge, invited date)
- Auto-invite button in detail dialog + inline in table row
- Delete org with confirmation
- Loading state during invite (can take seconds)

### Non-Functional
- Reuse DataTable pattern from Phase 3
- Components under 200 lines

## Architecture

```
client/src/
  pages/
    orgs-page.jsx              # Page container
  components/
    orgs/
      orgs-data-table.jsx      # DataTable (reuse pattern from accounts)
      orgs-columns.jsx         # Column definitions
      org-detail-dialog.jsx    # Org info + members table
      member-status-badge.jsx  # Colored badge for invite status
```

## Related Code Files
- **Create:** all files above
- **Reference:** `src/public/js/orgs.js`, `src/public/orgs.html`
- **Reuse:** DataTable pattern from Phase 3, `api.js` helpers
- **shadcn add:** (already added in Phase 3: table, dialog, badge)

## Implementation Steps

1. Create `components/orgs/member-status-badge.jsx`:
   - Map invite_status to shadcn Badge variant/color
   - `pending` = outline, `sent` = default, `joined` = success (green), `failed` = destructive
2. Create `components/orgs/orgs-columns.jsx`:
   - Columns: id, name (clickable), chatgpt_account_id (truncated monospace), plan_type (Badge), member_count (Badge), created_at, actions (invite btn + delete btn)
3. Create `components/orgs/orgs-data-table.jsx`:
   - Same pattern as accounts DataTable
   - Extract shared DataTable component if code is identical (DRY)
4. Create `components/orgs/org-detail-dialog.jsx`:
   - Props: `orgId`, `open`, `onOpenChange`, `onInvite`
   - Fetch org detail on open: `api.get(/api/orgs/{id})`
   - Display: org account ID, plan, created date
   - Members table: email, role, `<MemberStatusBadge>`, invited_at
   - "No members yet" empty state
   - Auto-invite button in footer
5. Create `pages/orgs-page.jsx`:
   - Fetch orgs on mount: `api.get('/api/orgs')`
   - State: orgs[], selectedOrgId, detailOpen
   - Auto-invite handler:
     - `api.post(/api/orgs/{id}/invite, {})`
     - Show loading toast, then result toast
     - Refresh org list + detail
   - Delete handler: confirm, `api.del()`, refresh

## DRY Opportunity
After building both DataTables, extract a generic `<DataTable columns={} data={} searchPlaceholder={}>` into `components/ui/data-table.jsx`. Both pages use it with different column configs.

## Todo
- [ ] Create member status badge component
- [ ] Create org column definitions
- [ ] Build orgs DataTable (or reuse generic)
- [ ] Build org detail dialog with member list
- [ ] Implement auto-invite with loading state
- [ ] Wire up orgs page
- [ ] Extract shared DataTable if duplicated

## Success Criteria
- Org table renders with all columns, searchable
- Clicking org name opens detail dialog with member list
- Auto-invite shows loading, then result (invited/failed counts)
- Delete works with confirmation
- Status badges correctly colored

## Risk Assessment
- **Auto-invite takes long** -- show loading spinner/toast; backend processes serially
- **Dialog vs Sheet** -- Dialog is better here (modal focus for invite action)
