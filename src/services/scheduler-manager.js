const { startAccountStatusScheduler } = require('./account-status-scheduler');

/** Start all background schedulers */
function startAll() {
  console.log('[scheduler] Starting background schedulers...');
  startAccountStatusScheduler();
  console.log('[scheduler] All schedulers started');
}

module.exports = { startAll };
