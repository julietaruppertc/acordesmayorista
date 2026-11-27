const { pool } = require('../config/database');
const env = require('../config/env');
const { poll } = require('./outboxWorker');

function startBlockchainWorker() {
  const dependencies = { includeEventTypes: ['ATTEST_HIGH_VALUE'] };
  const run = () => poll(dependencies);
  const timer = setInterval(run, env.OUTBOX_POLL_INTERVAL_SECONDS * 1000);
  run();

  async function shutdown() {
    clearInterval(timer);
    await pool.end();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  startBlockchainWorker();
}

module.exports = { startBlockchainWorker };
