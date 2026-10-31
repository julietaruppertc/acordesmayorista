async function enqueue(client, { eventType, payload, traceId }) {
  await client.query(
    `INSERT INTO mq.outbox (event_type, payload, trace_id, status)
     VALUES ($1, $2::jsonb, $3, 'PENDING')`,
    [eventType, JSON.stringify(payload), traceId]
  );
}

module.exports = { enqueue };
