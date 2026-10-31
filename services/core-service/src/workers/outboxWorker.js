const { pool, withTransaction } = require('../config/database');
const env = require('../config/env');

async function processOne() {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, event_type, payload, trace_id, attempts
         FROM mq.outbox
        WHERE status = 'PENDING' AND attempts < $1
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1`,
      [env.OUTBOX_MAX_ATTEMPTS]
    );
    const event = result.rows[0];
    if (!event) return false;

    await client.query(
      `UPDATE mq.outbox SET attempts = attempts + 1 WHERE id = $1`,
      [event.id]
    );

    console.log(
      `[NOTIFICACION] ${event.event_type} para orden ${event.payload.orderId} | TraceId: ${event.trace_id}`
    );

    await client.query(
      `UPDATE mq.outbox
          SET status = 'PROCESSED', processed_at = NOW(), last_error = NULL
        WHERE id = $1`,
      [event.id]
    );
    return true;
  });
}

async function poll() {
  try {
    while (await processOne()) {
      // Vacía los eventos disponibles antes de esperar el próximo intervalo.
    }
  } catch (error) {
    console.error('[OUTBOX]', error);
  }
}

function startWorker() {
  const timer = setInterval(poll, env.OUTBOX_POLL_INTERVAL_SECONDS * 1000);
  poll();

  async function shutdown() {
    clearInterval(timer);
    await pool.end();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  startWorker();
}

module.exports = { processOne, poll, startWorker };
