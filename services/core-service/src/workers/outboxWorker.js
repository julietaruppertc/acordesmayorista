const { pool, withTransaction } = require('../config/database');
const env = require('../config/env');
const blockchain = require('../modules/blockchain/blockchain.service');

async function claimOne({ includeEventTypes, excludeEventTypes } = {}) {
  const included = includeEventTypes?.length ? includeEventTypes : null;
  const excluded = excludeEventTypes?.length ? excludeEventTypes : null;
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, event_type, payload, trace_id, attempts
         FROM mq.outbox
        WHERE (
            (status = 'PENDING' AND attempts < $1)
            OR (
              status = 'PROCESSING'
              AND attempts <= $1
              AND locked_at < NOW() - ($2 * INTERVAL '1 second')
            )
          )
          AND ($3::text[] IS NULL OR event_type = ANY($3::text[]))
          AND ($4::text[] IS NULL OR NOT (event_type = ANY($4::text[])))
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1`,
      [env.OUTBOX_MAX_ATTEMPTS, env.OUTBOX_LOCK_TIMEOUT_SECONDS, included, excluded]
    );
    const event = result.rows[0];
    if (!event) return null;

    const claimed = await client.query(
      `UPDATE mq.outbox
          SET status = 'PROCESSING',
              attempts = CASE WHEN status = 'PENDING' THEN attempts + 1 ELSE attempts END,
              locked_at = NOW(), last_error = NULL
        WHERE id = $1
      RETURNING attempts`,
      [event.id]
    );
    return { ...event, attempts: Number(claimed.rows[0].attempts) };
  });
}

async function markProcessed(event, result = null) {
  return withTransaction(async (client) => {
    if (event.event_type === 'ATTEST_HIGH_VALUE') {
      await client.query(
        `UPDATE orders.orders
            SET blockchain_status = 'CONFIRMED',
                blockchain_tx_hash = $2,
                blockchain_evidence_hash = $3,
                blockchain_network = $4,
                blockchain_contract_address = $5,
                blockchain_attested_at = NOW(),
                updated_at = NOW()
          WHERE id = $1`,
        [
          event.payload.orderId,
          result.transactionHash,
          result.evidenceHash,
          env.BLOCKCHAIN_NETWORK,
          env.ATTESTATION_CONTRACT_ADDRESS
        ]
      );
    }

    await client.query(
      `UPDATE mq.outbox
          SET status = 'PROCESSED', processed_at = NOW(),
              locked_at = NULL, last_error = NULL
        WHERE id = $1`,
      [event.id]
    );
  });
}

async function markFailed(event, error) {
  const exhausted = event.attempts >= env.OUTBOX_MAX_ATTEMPTS;
  const message = String(error?.message || error).slice(0, 1000);
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE mq.outbox
          SET status = $2, locked_at = NULL, last_error = $3
        WHERE id = $1`,
      [event.id, exhausted ? 'FAILED' : 'PENDING', message]
    );
    if (event.event_type === 'ATTEST_HIGH_VALUE' && exhausted) {
      await client.query(
        `UPDATE orders.orders
            SET blockchain_status = 'FAILED', updated_at = NOW()
          WHERE id = $1 AND blockchain_status = 'PENDING'`,
        [event.payload.orderId]
      );
    }
  });
}

async function processEvent(event, dependencies = {}) {
  if (event.event_type === 'ATTEST_HIGH_VALUE') {
    const handler = dependencies.attestHighValueOrder || blockchain.attestHighValueOrder;
    const result = await handler({
      orderId: event.payload.orderId,
      paymentId: event.payload.paymentId,
      traceId: event.trace_id
    });
    console.log(
      `[BLOCKCHAIN] Pedido ${event.payload.orderId} notarizado en ${result.transactionHash} | TraceId: ${event.trace_id}`
    );
    return result;
  }

  console.log(
    `[NOTIFICACION] ${event.event_type} para orden ${event.payload.orderId} | TraceId: ${event.trace_id}`
  );
  return null;
}

async function processOne(dependencies = {}) {
  const event = await claimOne(dependencies);
  if (!event) return false;
  try {
    const result = await processEvent(event, dependencies);
    await markProcessed(event, result);
  } catch (error) {
    await markFailed(event, error);
    console.error(`[OUTBOX] Evento ${event.id} falló: ${error.message}`);
  }
  return true;
}

async function poll(dependencies = {}) {
  try {
    while (await processOne(dependencies)) {
      // Vacía los eventos disponibles antes de esperar el próximo intervalo.
    }
  } catch (error) {
    console.error('[OUTBOX]', error);
  }
}

function startWorker() {
  const dependencies = { excludeEventTypes: ['ATTEST_HIGH_VALUE'] };
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
  startWorker();
}

module.exports = { claimOne, processEvent, processOne, poll, startWorker };
