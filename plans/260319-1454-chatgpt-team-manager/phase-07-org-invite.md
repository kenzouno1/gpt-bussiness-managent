# Phase 7: Organization Invite

## Context Links
- [Plan Overview](plan.md)
- [Phase 3: Backend API](phase-03-backend-api.md)

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Bulk-invite GPT accounts to an organization using ChatGPT's internal API. Designed with pluggable API client.

## Key Insights
- ChatGPT internal API base: `https://chatgpt.com/backend-api/`
- Auth: `Authorization: Bearer {session_token}` from account's stored JWT
- Exact invite endpoint TBD -- design as pluggable
- Need an "admin" account per org (one whose session token is used to call invite API)
- Invite may require the invitee's email address

## Architecture

### Service: `src/services/chatgpt-api-client.js`
```
class ChatGPTAPIClient {
  constructor(sessionToken)
  async inviteToOrg(orgId, inviteeEmail) → { success, error? }
  async getOrgMembers(orgId) → [members]
}
```

### Invite Flow
```
POST /api/orgs/:id/invite { account_ids: [1,2,3] }
  → Pick admin account for org (first member or designated)
  → For each account_id:
    1. Look up account email
    2. Call ChatGPTAPIClient.inviteToOrg(orgId, email)
    3. Update org_members.invite_status
  → Return summary: { invited: N, failed: [...] }
```

### Pluggable Design
- `chatgpt-api-client.js` exports class with known interface
- Initially stub with TODO for actual API calls
- Easy to swap in real implementation once endpoint is confirmed
- Config: API base URL from env var `CHATGPT_API_BASE`

## Implementation Steps

1. Create `src/services/chatgpt-api-client.js`:
   - Constructor takes sessionToken
   - `inviteToOrg(orgAccountId, email)`:
     - POST to `${CHATGPT_API_BASE}/organizations/${orgAccountId}/invites`
     - Body: `{ email, role: "member" }`
     - Headers: `Authorization: Bearer ${sessionToken}`
     - Return `{ success: true }` or `{ success: false, error: message }`
   - Add retry logic (1 retry on 429/5xx)
   - Rate limit: 1 request per second (simple delay)

2. Implement invite route in `src/routes/org-routes.js`:
   - POST /api/orgs/:id/invite
   - Validate account_ids array
   - Find org's admin session token (use first member's token or a designated one)
   - Loop through account_ids, call invite for each
   - Update org_members.invite_status per result
   - Return summary

3. Frontend invite UI in `orgs.js`:
   - Invite modal: list accounts NOT in org as checkboxes
   - "Invite Selected" button → POST /api/orgs/:id/invite
   - Show progress/results in modal
   - Refresh member list on completion

## Related Code Files
- **Create:** `src/services/chatgpt-api-client.js`
- **Modify:** `src/routes/org-routes.js` (invite endpoint)
- **Modify:** `src/public/js/orgs.js` (invite modal)

## Todo List
- [ ] chatgpt-api-client.js with pluggable interface
- [ ] Invite API endpoint
- [ ] Admin token selection logic
- [ ] Per-account invite status tracking
- [ ] Frontend invite modal
- [ ] Error display for failed invites

## Success Criteria
- Invite endpoint accepts account_ids and returns per-account results
- Failed invites don't block others
- org_members.invite_status updated correctly
- Frontend shows success/failure per account
- Pluggable: swapping API client requires changing only one file

## Risk Assessment
- **API endpoint unknown:** Stubbed out; real implementation once confirmed
- **Token expiry:** Session tokens may expire; invite will fail gracefully with error message
- **Rate limits:** 1 req/sec delay prevents hammering ChatGPT API

## Unresolved Questions
- Exact ChatGPT invite API endpoint and request format
- Whether org admin role is needed or any member can invite
- Rate limit thresholds for ChatGPT API
