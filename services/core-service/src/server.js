const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/database');

const server = app.listen(env.CORE_PORT, () => {
  console.log(`[CORE] Escuchando en el puerto ${env.CORE_PORT}`);
});

async function shutdown(signal) {
  console.log(`[CORE] Recibida señal ${signal}. Cerrando conexiones...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
