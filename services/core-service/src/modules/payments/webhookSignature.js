const crypto = require('crypto');
const env = require('../../config/env');
const AppError = require('../../shared/AppError');

function createSignature(rawBody) {
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  const digest = crypto
    .createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return `sha256=${digest}`;
}

function signPayload(payload) {
  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return createSignature(rawBody);
}

function verifyWebhookSignature(req, _res, next) {
  const received = req.header('x-webhook-signature');
  if (!received || !req.rawBody) {
    return next(
      new AppError(
        401,
        'WEBHOOK_SIGNATURE_REQUIRED',
        'La notificación de pago no contiene una firma válida.'
      )
    );
  }

  const expected = createSignature(req.rawBody);
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  const valid =
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer);

  if (!valid) {
    return next(
      new AppError(
        401,
        'INVALID_WEBHOOK_SIGNATURE',
        'No se pudo comprobar el origen de la notificación de pago.'
      )
    );
  }

  next();
}

module.exports = { createSignature, signPayload, verifyWebhookSignature };
