/**
 * ChatGPT API client for organization management
 * Uses session tokens (JWT) to call ChatGPT internal API
 * Requires browser-like headers to avoid 403
 */

const BASE_URL = 'https://chatgpt.com/backend-api';

const BROWSER_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Origin': 'https://chatgpt.com',
  'Referer': 'https://chatgpt.com/',
};

function authHeaders(token) {
  return { ...BROWSER_HEADERS, 'Authorization': `Bearer ${token}` };
}

// Check if token is valid
async function checkToken(token) {
  try {
    const res = await fetch(`${BASE_URL}/me`, { headers: authHeaders(token) });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Invite a user to a ChatGPT workspace/org: POST /accounts/{id}/invites
async function inviteToOrg(sessionToken, email, role = 'reader') {
  const accountId = extractAccountId(sessionToken);
  if (!accountId) return { success: false, error: 'Cannot extract account ID' };

  try {
    const res = await fetch(`${BASE_URL}/accounts/${accountId}/invites`, {
      method: 'POST',
      headers: authHeaders(sessionToken),
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }
    return { success: true, data: await res.json() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Extract chatgpt_account_id from JWT token (team account, not personal)
function extractAccountId(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const auth = payload['https://api.openai.com/auth'] || {};
    // Return team account ID if plan is team, otherwise the default account ID
    return auth.chatgpt_account_id;
  } catch { return null; }
}

// List workspace members: /accounts/{account_id}/users
async function listOrgMembers(sessionToken) {
  const accountId = extractAccountId(sessionToken);
  if (!accountId) return { success: false, error: 'Cannot extract account ID from token' };

  try {
    const res = await fetch(`${BASE_URL}/accounts/${accountId}/users`, { headers: authHeaders(sessionToken) });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }
    return { success: true, data: await res.json() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// List pending invites: /accounts/{account_id}/invites
async function listInvites(sessionToken) {
  const accountId = extractAccountId(sessionToken);
  if (!accountId) return { success: false, error: 'Cannot extract account ID from token' };

  try {
    const res = await fetch(`${BASE_URL}/accounts/${accountId}/invites`, { headers: authHeaders(sessionToken) });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }
    return { success: true, data: await res.json() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Revoke a pending invite: DELETE /accounts/{account_id}/invites/{invite_id}
async function revokeInvite(sessionToken, inviteId) {
  const accountId = extractAccountId(sessionToken);
  if (!accountId) return { success: false, error: 'Cannot extract account ID' };

  try {
    const res = await fetch(`${BASE_URL}/accounts/${accountId}/invites/${inviteId}`, {
      method: 'DELETE',
      headers: authHeaders(sessionToken),
    });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { checkToken, inviteToOrg, listOrgMembers, listInvites, revokeInvite };
