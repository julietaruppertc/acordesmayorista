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
  DATABASE_SSL: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  ENABLE_PAYMENT_SIMULATOR: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  RESERVATION_TTL_MINUTES: z.coerce.number().int().positive().default(5),
  RESERVATION_JOB_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),
  OUTBOX_POLL_INTERVAL_SECONDS: z.coerce.number().int().positive().default(5),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  OUTBOX_LOCK_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(300),
  PAYMENT_WEBHOOK_SECRET: z.string().min(32),
  BLOCKCHAIN_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  BLOCKCHAIN_RPC_URL: z.string().default(''),
  RELAYER_PRIVATE_KEY: z.string().default(''),
  ATTESTATION_CONTRACT_ADDRESS: z.string().default(''),
  BLOCKCHAIN_NETWORK: z.string().trim().min(1).default('sepolia'),
  BLOCKCHAIN_CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  BLOCKCHAIN_DEPLOYMENT_BLOCK: z.coerce.number().int().nonnegative().default(0),
  BLOCKCHAIN_EXPLORER_URL: z.string().url().default('https://sepolia.etherscan.io/tx/'),
  BLOCKCHAIN_CONFIRMATIONS: z.coerce.number().int().positive().default(1),
  BLOCKCHAIN_TX_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(180),
  HIGH_VALUE_THRESHOLD_ARS: z.coerce.number().positive().default(2000000),
  TRUST_GATEWAY_HEADERS: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Configuración inválida: ${parsed.error.message}`);
}

if (parsed.data.BLOCKCHAIN_ENABLED) {
  const missing = [];
  if (!parsed.data.BLOCKCHAIN_RPC_URL) missing.push('BLOCKCHAIN_RPC_URL');
  if (!parsed.data.ATTESTATION_CONTRACT_ADDRESS) missing.push('ATTESTATION_CONTRACT_ADDRESS');
  if (missing.length > 0) {
    throw new Error(`Configuración blockchain incompleta: faltan ${missing.join(', ')}.`);
  }
}

if (
  parsed.data.NODE_ENV === 'production' &&
  ['change-this-local-demo-secret-32-chars', '<private-random-value-min-32-chars>'].includes(
    parsed.data.PAYMENT_WEBHOOK_SECRET
  )
) {
  throw new Error('PAYMENT_WEBHOOK_SECRET debe cambiarse antes de ejecutar en producción.');
}

module.exports = parsed.data;
