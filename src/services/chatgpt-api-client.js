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

function authHeaders(token, workspaceId) {
  const h = { ...BROWSER_HEADERS, 'Authorization': `Bearer ${token}` };
  // Must send workspace account ID for team operations
  if (workspaceId) h['ChatGPT-Account-Id'] = workspaceId;
  return h;
}

// Check if token is valid — returns full account info including plan/subscription
async function checkToken(token) {
  try {
    const res = await fetch(`${BASE_URL}/accounts/check/v4-2023-04-27`, { headers: authHeaders(token) });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Invite users to a ChatGPT workspace: POST /accounts/{id}/invites
// Accepts single email or array of emails
async function inviteToOrg(sessionToken, emails, role = 'standard-user') {
  const wsId = await getWorkspaceId(sessionToken);
  if (!wsId) return { success: false, error: 'Cannot find workspace account' };

  const emailList = Array.isArray(emails) ? emails : [emails];

  try {
    const res = await fetch(`${BASE_URL}/accounts/${wsId}/invites`, {
      method: 'POST',
      headers: authHeaders(sessionToken, wsId),
      body: JSON.stringify({ email_addresses: emailList, role }),
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

// Extract account info from JWT — returns both personal and can be used to find workspace
function extractAccountId(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const auth = payload['https://api.openai.com/auth'] || {};
    return auth.chatgpt_account_id;
  } catch { return null; }
}

// Get workspace account ID by checking /accounts/check first
// This is needed because the JWT contains the personal account ID by default
async function getWorkspaceId(token) {
  try {
    const res = await fetch(`${BASE_URL}/accounts/check/v4-2023-04-27`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    const data = await res.json();
    const allAccounts = data?.accounts || {};
    for (const [accId, accInfo] of Object.entries(allAccounts)) {
      if (accId === 'default') continue;
      if (accInfo?.account?.structure === 'workspace' || accInfo?.account?.plan_type === 'team') {
        return accId;
      }
    }
    return null;
  } catch { return null; }
}

// List workspace members: /accounts/{workspace_id}/users
async function listOrgMembers(sessionToken, workspaceId) {
  const wsId = workspaceId || await getWorkspaceId(sessionToken);
  if (!wsId) return { success: false, error: 'Cannot find workspace account' };

  try {
    const res = await fetch(`${BASE_URL}/accounts/${wsId}/users`, { headers: authHeaders(sessionToken, wsId) });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }
    return { success: true, data: await res.json() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// List pending invites: /accounts/{workspace_id}/invites
async function listInvites(sessionToken, workspaceId) {
  const wsId = workspaceId || await getWorkspaceId(sessionToken);
  if (!wsId) return { success: false, error: 'Cannot find workspace account' };

  try {
    const res = await fetch(`${BASE_URL}/accounts/${wsId}/invites`, { headers: authHeaders(sessionToken, wsId) });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }
    return { success: true, data: await res.json() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Revoke a pending invite: DELETE /accounts/{workspace_id}/invites/{invite_id}
async function revokeInvite(sessionToken, inviteId) {
  const wsId = await getWorkspaceId(sessionToken);
  if (!wsId) return { success: false, error: 'Cannot find workspace account' };

  try {
    const res = await fetch(`${BASE_URL}/accounts/${wsId}/invites/${inviteId}`, {
      method: 'DELETE',
      headers: authHeaders(sessionToken, wsId),
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
