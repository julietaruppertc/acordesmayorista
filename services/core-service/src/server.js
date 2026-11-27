const { spawn } = require('child_process');
const path = require('path');
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/database');

const port = Number(process.env.PORT || env.CORE_PORT || 4002);
const serviceRoot = path.resolve(__dirname, '..');
const managedChildren = new Set();
let isShuttingDown = false;

function startManagedScript(scriptName) {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  const launch = () => {
    if (isShuttingDown) return;

    const child = spawn(npmCmd, ['run', scriptName], {
      cwd: serviceRoot,
      stdio: 'inherit',
      env: process.env
    });

    managedChildren.add(child);

    child.on('exit', (code) => {
      managedChildren.delete(child);
      if (isShuttingDown) return;
      console.error(`[CORE] ${scriptName} finalizó (código ${code}). Reiniciando en 5s...`);
      setTimeout(launch, 5000).unref();
    });
  };

  launch();
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[CORE] Escuchando en el puerto ${port}`);

  if (process.env.NODE_ENV !== 'test') {
    startManagedScript('worker');
    startManagedScript('blockchain-worker');
    startManagedScript('expire-reservations');
  }
});

async function shutdown(signal) {
  isShuttingDown = true;
  console.log(`[CORE] Recibida señal ${signal}. Cerrando conexiones y workers...`);

  for (const child of managedChildren) {
    child.kill('SIGTERM');
  }

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));