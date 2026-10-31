const runSqlDirectory = require('./runSqlDirectory');
const { pool } = require('../src/config/database');

runSqlDirectory('migrations')
  .then(() => console.log('[MIGRATIONS] Esquema actualizado.'))
  .catch((error) => {
    console.error('[MIGRATIONS]', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
