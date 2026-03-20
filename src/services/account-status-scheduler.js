const cron = require('node-cron');
const db = require('../db/database');
const { checkToken } = require('./chatgpt-api-client');
const JobQueue = require('./job-queue');

// Dedicated queue for account checks — 2s delay between checks
const accountCheckQueue = new JobQueue('account-check', { delayMs: 2000 });

/** Check single account token validity and update DB */
async function checkAccountToken(accountId) {
  const account = db.prepare('SELECT id, email, session_token FROM accounts WHERE id = ?').get(accountId);
  if (!account || !account.session_token) return { status: 'no_token' };

  const result = await checkToken(account.session_token);
  const status = result.success ? 'valid' : 'invalid';

  db.prepare('UPDATE accounts SET token_status = ?, token_checked_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, accountId);

  console.log(`[account-check] ${account.email}: ${status}`);
  return { email: account.email, status };
}

// Register queue handler
accountCheckQueue.process(async (job) => {
  return await checkAccountToken(job.data.accountId);
});

/** Enqueue all accounts with session tokens for checking */
function enqueueAllAccountChecks() {
  const accounts = db.prepare('SELECT id FROM accounts WHERE session_token IS NOT NULL').all();
  let queued = 0;
  for (const acc of accounts) {
    if (accountCheckQueue.add(`acc-${acc.id}`, { accountId: acc.id })) queued++;
  }
  console.log(`[account-check] Enqueued ${queued}/${accounts.length} accounts`);
  return { queued, total: accounts.length };
}

/** Start the 30-minute cron scheduler */
function startAccountStatusScheduler() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    console.log('[account-check] Scheduled check starting...');
    enqueueAllAccountChecks();
  });

  console.log('[scheduler] Account status checker: every 30 minutes');
}

/** Get queue status */
function getAccountCheckStatus() {
  return accountCheckQueue.getStatus();
}

module.exports = { startAccountStatusScheduler, enqueueAllAccountChecks, getAccountCheckStatus };
