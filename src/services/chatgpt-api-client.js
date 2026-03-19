/**
 * ChatGPT API client for organization management
 * Uses session tokens (JWT) to call ChatGPT internal API
 */

const BASE_URL = 'https://chatgpt.com/backend-api';

/**
 * Invite a user to a ChatGPT workspace/org
 * @param {string} sessionToken - JWT access token of an admin/owner
 * @param {string} email - Email to invite
 * @param {string} role - 'reader' or 'owner'
 */
async function inviteToOrg(sessionToken, email, role = 'reader') {
  try {
    const res = await fetch(`${BASE_URL}/accounts/invites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, role }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * List workspace members
 */
async function listOrgMembers(sessionToken) {
  try {
    const res = await fetch(`${BASE_URL}/accounts/members`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * List pending invites for a workspace
 */
async function listInvites(sessionToken) {
  try {
    const res = await fetch(`${BASE_URL}/accounts/invites`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` },
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

/**
 * Revoke/cancel a pending invite by invite ID
 */
async function revokeInvite(sessionToken, inviteId) {
  try {
    const res = await fetch(`${BASE_URL}/accounts/invites/${inviteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
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

module.exports = { inviteToOrg, listOrgMembers, listInvites, revokeInvite };
