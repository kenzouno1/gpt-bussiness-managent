# Phase 6: TOTP Real-time Display

## Context Links
- [Plan Overview](plan.md)
- [Phase 3: Backend API](phase-03-backend-api.md)
- [Phase 4: Frontend UI](phase-04-frontend-ui.md)

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Generate TOTP codes server-side from stored secrets and display with live countdown on frontend.

## Key Insights
- 2FA column contains base32-encoded TOTP secrets (e.g., `GUBC7QCB7CQ45EZMRE7PWTGE34FE34QW`)
- Standard TOTP: 6 digits, 30-second period, SHA-1 (default)
- Server generates code to avoid exposing secrets to browser
- Frontend polls every second for countdown, fetches new code every 30s

## Architecture

### Backend: `src/services/totp-service.js`
```js
const { TOTP } = require('otpauth');

function generateTOTP(secret) {
  const totp = new TOTP({ secret, digits: 6, period: 30 });
  const code = totp.generate();
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  return { code, remaining };
}
```

### Endpoint: GET /api/accounts/:id/totp
- Response: `{ success: true, data: { code: "123456", remaining: 18 } }`

### Frontend: TOTP Widget
- In account detail modal, show TOTP code in large monospace font
- Circular/bar countdown timer (CSS-only, no extra lib)
- JS: fetch code on modal open, then setInterval every 1s to decrement `remaining`
- When remaining hits 0, fetch new code

## Implementation Steps

1. Create `src/services/totp-service.js`:
   - Export `generateTOTP(base32Secret)` → `{ code, remaining }`
   - Handle invalid secrets gracefully (return error)

2. Wire into account routes:
   - GET /api/accounts/:id/totp
   - Fetch account's totp_secret from DB
   - Call `generateTOTP(secret)`
   - Return code + remaining seconds

3. Frontend TOTP widget in `accounts.js`:
   - `startTotpRefresh(accountId)`:
     - Fetch /api/accounts/:id/totp
     - Display code in `#totp-code` element
     - Start countdown interval
     - On reaching 0, re-fetch
   - `stopTotpRefresh()`: clear interval on modal close
   - CSS: progress bar width = `(remaining/30)*100%`, transition 1s linear

4. Add TOTP display to accounts list table:
   - "Show 2FA" button per row → opens mini-popover or inline display
   - Alternative: only show in detail modal (simpler)

## Related Code Files
- **Create:** `src/services/totp-service.js`
- **Modify:** `src/routes/account-routes.js` (add TOTP endpoint)
- **Modify:** `src/public/js/accounts.js` (TOTP widget)
- **Modify:** `src/public/css/styles.css` (countdown styling)

## Todo List
- [ ] totp-service.js with otpauth
- [ ] TOTP API endpoint
- [ ] Frontend countdown widget
- [ ] Auto-refresh on timer expiry
- [ ] Cleanup interval on modal close

## Success Criteria
- TOTP code matches standard authenticator apps (Google Auth, Authy)
- Code refreshes automatically every 30 seconds
- Countdown timer visually shows time remaining
- No memory leaks (intervals cleaned up)
