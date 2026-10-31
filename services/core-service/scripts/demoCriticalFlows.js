const crypto = require('crypto');

const baseUrl = process.env.DEMO_API_URL || 'http://localhost:4002';
const userId = process.env.DEMO_USER_ID || 'demo-concurrency-user';
const traceId = `demo-${crypto.randomUUID()}`;

const headers = {
  'Content-Type': 'application/json',
  'X-User-Id': userId,
  'X-User-Role': 'cliente',
  'X-Trace-Id': traceId
};

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { status: response.status, body };
}

async function main() {
  console.log(`[DEMO] API: ${baseUrl}`);
  const catalog = await jsonRequest('/api/products?pageSize=100');
  if (catalog.status !== 200) throw new Error(`No se pudo leer el catálogo: ${catalog.status}`);

  const product = catalog.body.data.find((item) => item.availableStock > 0);
  if (!product) throw new Error('No hay productos con stock disponible para la demostración.');

  console.log(
    `[DEMO] Producto: ${product.name} | disponible=${product.availableStock} | version=${product.version}`
  );

  const checkoutBody = JSON.stringify({
    items: [{ productId: product.id, quantity: 1, expectedVersion: product.version }]
  });

  const attempts = await Promise.all(
    Array.from({ length: 10 }, () =>
      jsonRequest('/api/orders/checkout', { method: 'POST', headers, body: checkoutBody })
    )
  );
  const successes = attempts.filter((result) => result.status === 201);
  const conflicts = attempts.filter((result) => result.status === 409);

  console.log(`[CONCURRENCIA] exitosos=${successes.length} conflictos=${conflicts.length}`);
  if (successes.length !== 1 || conflicts.length !== 9) {
    throw new Error('El resultado de concurrencia no coincide con 1 éxito y 9 conflictos.');
  }

  const orderId = successes[0].body.data.id;
  const paymentId = `PAY-DEMO-${crypto.randomUUID()}`;
  const webhookBody = JSON.stringify({
    paymentId,
    orderId,
    status: 'APPROVED',
    amount: successes[0].body.data.total
  });

  const webhooks = await Promise.all(
    Array.from({ length: 5 }, () =>
      jsonRequest('/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Trace-Id': traceId },
        body: webhookBody
      })
    )
  );

  const processed = webhooks.filter((result) => result.body.data?.status === 'processed');
  const ignored = webhooks.filter(
    (result) => result.body.data?.reason === 'already_processed'
  );
  console.log(`[IDEMPOTENCIA] procesados=${processed.length} duplicados_ignorados=${ignored.length}`);

  if (processed.length !== 1 || ignored.length !== 4) {
    throw new Error('El resultado idempotente no coincide con 1 procesado y 4 ignorados.');
  }

  console.log(`[DEMO] Escenarios aprobados | orderId=${orderId} | traceId=${traceId}`);
}

main().catch((error) => {
  console.error('[DEMO] Falló:', error.message);
  process.exitCode = 1;
});
