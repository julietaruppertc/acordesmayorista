const fs = require('fs/promises');
const path = require('path');
const { pool } = require('../src/config/database');

async function runSqlDirectory(directoryName) {
  const directory = path.resolve(__dirname, '..', directoryName);
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(directory, file), 'utf8');
    console.log(`[SQL] Ejecutando ${directoryName}/${file}`);
    await pool.query(sql);
  }
}

module.exports = runSqlDirectory;
