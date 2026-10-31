const runSqlDirectory = require('./runSqlDirectory');
const { pool } = require('../src/config/database');

runSqlDirectory('seeds')
  .then(() => console.log('[SEEDS] Datos de demostración cargados.'))
  .catch((error) => {
    console.error('[SEEDS]', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
