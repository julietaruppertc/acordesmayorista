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
  TRUST_GATEWAY_HEADERS: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Configuración inválida: ${parsed.error.message}`);
}

module.exports = parsed.data;
