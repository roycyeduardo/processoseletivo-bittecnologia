/**
 * Cria o banco, as tabelas e os dados iniciais executando os scripts .sql
 * desta pasta em ordem. Uso: npm run db:setup
 *
 * ATENÇÃO: recria as tabelas — todos os dados existentes são apagados.
 */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const env = require('../src/config/env');

const SCRIPTS = ['01_schema.sql', '02_seed.sql'];

/** Divide um script T-SQL nos separadores "GO" (usados pelo sqlcmd/SSMS). */
function splitBatches(script) {
  return script
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

async function run() {
  // Conecta no master: o banco da aplicação pode ainda não existir.
  const pool = await new sql.ConnectionPool({ ...env.db, database: 'master' }).connect();
  try {
    for (const file of SCRIPTS) {
      const script = fs.readFileSync(path.join(__dirname, file), 'utf8');
      const batches = splitBatches(script);
      for (const batch of batches) {
        await pool.request().batch(batch);
      }
      console.log(`✔ ${file} (${batches.length} lotes)`);
    }
    console.log(`Banco "${env.db.database}" pronto.`);
  } finally {
    await pool.close();
  }
}

run().catch((err) => {
  console.error('Falha ao configurar o banco:', err.message);
  process.exit(1);
});
