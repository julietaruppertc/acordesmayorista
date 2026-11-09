const env = require('../../config/env');
const AppError = require('../../shared/AppError');
const orders = require('../orders/orders.service');
const { signPayload } = require('./webhookSignature');

// MVP only: admin acts as the simulated provider; no money is charged.
async function resolveOrder(orderId, decision, context) {
  if (!env.ENABLE_PAYMENT_SIMULATOR) {
    throw new AppError(403, 'PAYMENT_SIMULATOR_DISABLED', 'El simulador de pagos no est\u00e1 habilitado.');
  }
  const order = await orders.getById(orderId, context);
  const payload = {
    paymentId: `admin-simulation-${orderId}`,
    orderId,
    status: decision,
    amount: order.total
  };
  const rawBody = JSON.stringify(payload);
  let response;
  try {
    // Fixed loopback URL: never accept a destination or signature from the browser.
    response = await fetch(`http://127.0.0.1:${env.CORE_PORT}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signPayload(rawBody),
        'X-Trace-Id': context.traceId
      },
      body: rawBody,
      signal: AbortSignal.timeout(5000)
    });
  } catch (_error) {
    throw new AppError(502, 'PAYMENT_SIMULATION_UNAVAILABLE', 'No se pudo verificar el resultado. Actualice el pedido antes de reintentar.');
  }
  if (!response.ok) {
    const body = await response.json();
    throw new AppError(response.status, body.error || 'PAYMENT_SIMULATION_FAILED', body.message || 'No se pudo resolver el pedido.');
  }
  await response.json();
  // Return the persisted state, including EXPIRED or an earlier resolution.
  return orders.getById(orderId, context);
}

module.exports = { resolveOrder };
