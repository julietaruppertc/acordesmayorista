const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORE_PORT: z.coerce.number().int().positive().default(4002),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://postgres:postgres@localhost:5432/acordes_core'),
  RESERVATION_TTL_MINUTES: z.coerce.number().int().positive().default(5),
  RESERVATION_JOB_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),
  OUTBOX_POLL_INTERVAL_SECONDS: z.coerce.number().int().positive().default(5),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  PAYMENT_WEBHOOK_SECRET: z.string().min(32),
  TRUST_GATEWAY_HEADERS: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Configuración inválida: ${parsed.error.message}`);
}

if (
  parsed.data.NODE_ENV === 'production' &&
  parsed.data.PAYMENT_WEBHOOK_SECRET === 'change-this-local-demo-secret-32-chars'
) {
  throw new Error('PAYMENT_WEBHOOK_SECRET debe cambiarse antes de ejecutar en producción.');
}

module.exports = parsed.data;
