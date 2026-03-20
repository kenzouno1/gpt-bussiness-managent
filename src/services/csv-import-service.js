const Papa = require('papaparse');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

/**
 * Parse hotmail field: "email|id|session|uuid"
 */
function parseHotmail(raw) {
  if (!raw) return {};
  const parts = raw.split('|');
  return {
    hotmail_email: parts[0] || null,
    hotmail_id: parts[1] || null,
    hotmail_session: parts[2] || null,
    hotmail_uuid: parts[3] || null,
  };
}

/**
 * Decode JWT to extract ChatGPT account info (no verification)
 */
function decodeJWT(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return {};
    const auth = decoded['https://api.openai.com/auth'] || {};
    const profile = decoded['https://api.openai.com/profile'] || {};
    return {
      chatgpt_account_id: auth.chatgpt_account_id || null,
      chatgpt_user_id: auth.chatgpt_user_id || null,
      chatgpt_plan_type: auth.chatgpt_plan_type || null,
      profile_email: profile.email || null,
    };
  } catch {
    return {};
  }
}

/**
 * Import CSV content into database
 * Returns { imported, skipped, orgsCreated, errors }
 */
function importCSV(csvContent) {
  const results = { imported: 0, skipped: 0, orgsCreated: 0, newOrgIds: [], errors: [] };

  // Remove BOM if present
  const clean = csvContent.replace(/^\uFEFF/, '');
  const parsed = Papa.parse(clean, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    results.errors.push(...parsed.errors.map(e => e.message));
  }

  // Prepared statements
  const insertAccount = db.prepare(`
    INSERT OR IGNORE INTO accounts
    (email, password,
     hotmail_email, hotmail_id, hotmail_session, hotmail_uuid,
     totp_secret, session_token,
     chatgpt_account_id, chatgpt_user_id, chatgpt_plan_type, created_at)
    VALUES (@email, @password,
     @hotmail_email, @hotmail_id, @hotmail_session, @hotmail_uuid,
     @totp_secret, @session_token,
     @chatgpt_account_id, @chatgpt_user_id, @chatgpt_plan_type, @created_at)
  `);

  const insertOrg = db.prepare(`
    INSERT OR IGNORE INTO organizations (chatgpt_account_id, name, plan_type)
    VALUES (@chatgpt_account_id, @name, @plan_type)
  `);

  const findOrg = db.prepare(`SELECT id FROM organizations WHERE chatgpt_account_id = ?`);
  const findAccount = db.prepare(`SELECT id FROM accounts WHERE email = ?`);

  const insertOwner = db.prepare(`
    INSERT OR IGNORE INTO org_members (org_id, account_id, role, invite_status)
    VALUES (@org_id, @account_id, 'owner', 'joined')
  `);
  const insertMember = db.prepare(`
    INSERT OR IGNORE INTO org_members (org_id, account_id, role, invite_status)
    VALUES (@org_id, @account_id, 'member', 'joined')
  `);
  const orgHasOwner = db.prepare(
    `SELECT 1 FROM org_members WHERE org_id = ? AND role = 'owner' LIMIT 1`
  );

  // Process in a transaction for performance
  const importAll = db.transaction((rows) => {
    for (const row of rows) {
      try {
        const email = (row['Email'] || '').trim();
        if (!email) continue;

        const hotmail = parseHotmail(row['Hotmail']);
        const jwtData = decodeJWT(row['Session']);

        const accountData = {
          email,
          password: row['Password'] || null,
          ...hotmail,
          totp_secret: row['2FA'] || null,
          session_token: row['Session'] || null,
          ...jwtData,
          created_at: row['Created At'] || null,
        };
        delete accountData.profile_email;

        const result = insertAccount.run(accountData);
        if (result.changes > 0) {
          results.imported++;
        } else {
          results.skipped++;
        }

        // Auto-create org if chatgpt_account_id exists
        if (jwtData.chatgpt_account_id) {
          const orgName = `${email} - ${jwtData.chatgpt_account_id.substring(0, 8)}`;
          const orgResult = insertOrg.run({
            chatgpt_account_id: jwtData.chatgpt_account_id,
            name: orgName,
            plan_type: jwtData.chatgpt_plan_type || null,
          });
          if (orgResult.changes > 0) {
            results.orgsCreated++;
            const newOrg = findOrg.get(jwtData.chatgpt_account_id);
            if (newOrg) results.newOrgIds.push(newOrg.id);
          }

          // Link account to org — only first account becomes owner
          const org = findOrg.get(jwtData.chatgpt_account_id);
          const account = findAccount.get(email);
          if (org && account) {
            const hasOwner = orgHasOwner.get(org.id);
            const stmt = hasOwner ? insertMember : insertOwner;
            stmt.run({ org_id: org.id, account_id: account.id });
          }
        }
      } catch (err) {
        results.errors.push(`Row ${email || '?'}: ${err.message}`);
      }
    }
  });

  importAll(parsed.data);
  return results;
}

module.exports = { importCSV, decodeJWT, parseHotmail };
