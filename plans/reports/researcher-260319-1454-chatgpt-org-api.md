# ChatGPT Organization API Research Report

**Date:** 2026-03-19 | **Status:** Incomplete - Limited Official Documentation

## Summary

ChatGPT Business/Teams **does not expose a public REST API** for organization management. Unlike OpenAI Platform API (`api.openai.com`), the ChatGPT web interface (`chatgpt.com`) lacks documented endpoints for programmatic org management. All research points to UI-only workflows or OpenAI Platform API.

## Key Findings

### 1. No ChatGPT Web API for Org Management
- ChatGPT Business workspace management is **UI-only** (no official API)
- Authentication via JWT session tokens retrieved from `https://chatgpt.com/api/auth/session`
- No documented endpoints like `/api/organizations`, `/api/invite`, `/api/members`
- Reverse-engineered projects (acheong08/ChatGPT) only expose conversation/model endpoints, not org management

### 2. Session Token Authentication (chatgpt.com)
```
GET https://chatgpt.com/api/auth/session
→ Returns: { accessToken, ... }

Headers for authenticated requests:
- Authorization: Bearer <accessToken>
- CSRF Token (required): GET /api/auth/csrf
```

### 3. OpenAI Platform API Alternative (`api.openai.com`)
If managing through OpenAI's API layer instead:
```
Base URL: https://api.openai.com/v1/
Auth: Authorization: Bearer <api_key>

Endpoints (api.openai.com, NOT chatgpt.com):
- List orgs: GET /organizations
- List org members: GET /organizations/{org_id}/users
- Invite user: POST /organizations/{org_id}/invites
  Body: { "email": "user@example.com", "role": "member" }
```

**Critical:** OpenAI API is separate billing from ChatGPT Business workspace. API keys are different from session tokens.

### 4. ChatGPT Business Workspace (UI Only)
Member management in web UI:
- Profile → Manage Workspace → Members tab
- Invite via email or CSV import (format: email,role)
- Roles: Owner, Admin, Member
- Remove via three-dot menu

No programmatic API exists for these operations.

## Known Limitations

1. **No official ChatGPT Business API** for user management
2. **JWT session tokens** contain `chatgpt_account_id` and org info but no endpoints to leverage them
3. **Reverse engineering risks:** Undocumented endpoints change without notice
4. **Billing separation:** ChatGPT Business ≠ OpenAI Platform API (different systems)

## Unresolved Questions

- Does ChatGPT Business expose internal/undocumented API endpoints for workspace management?
- Are there hidden endpoints that accept JWT session tokens for org operations?
- Does OpenAI plan to release ChatGPT Business management API?
- Can workspace operations be automated through ChatGPT Business without UI access?

---

**Sources:**
- [ChatGPT Business Workspace Management](https://help.openai.com/en/articles/8798577-how-to-manage-your-chatgpt-business-workspace)
- [Managing Members in ChatGPT Business](https://help.openai.com/en/articles/8798596-managing-members-in-your-chatgpt-business-workspace)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/introduction)
- [Reverse Engineered ChatGPT](https://github.com/acheong08/ChatGPT)
- [OpenAI Session Token Documentation](https://chatgpt.com/api/auth/session)
