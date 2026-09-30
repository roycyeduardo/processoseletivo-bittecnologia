const sql = require('mssql');
const env = require('./env');

let poolPromise = null;

/** Retorna um pool de conexões único (criado sob demanda). */
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(env.db).connect().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise;
    poolPromise = null;
    await pool.close();
  }
}

module.exports = { sql, getPool, closePool };
