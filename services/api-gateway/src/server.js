const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const createApp = require('./app');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const port = Number(process.env.GATEWAY_PORT || 4000);
const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const coreUrl = process.env.CORE_SERVICE_URL || 'http://localhost:4002';
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const publicKeyPath = process.env.PUBLIC_KEY_PATH
  ? path.resolve(__dirname, '..', process.env.PUBLIC_KEY_PATH)
  : path.resolve(__dirname, '../../../shared/keys/public.pem');

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('GATEWAY_PORT debe ser un puerto válido.');
}
for (const [name, value] of [['AUTH_SERVICE_URL', authUrl], ['CORE_SERVICE_URL', coreUrl]]) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} debe ser una URL base HTTP(S) sin ruta ni parámetros.`);
  }
}

const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
const app = createApp({ authUrl, coreUrl, publicKey, corsOrigin });
app.listen(port, () => {
  console.log(`[GATEWAY] Escuchando en el puerto ${port}`);
});
