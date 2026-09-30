const { sql, getPool } = require('../config/database');

async function listCategorias() {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT Id AS id, Nome AS nome FROM dbo.Categorias ORDER BY Nome');
  return result.recordset;
}

async function listStatus() {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT Id AS id, Nome AS nome FROM dbo.StatusSolicitacao ORDER BY Id');
  return result.recordset;
}

async function categoriaExists(categoriaId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, categoriaId)
    .query('SELECT 1 AS ok FROM dbo.Categorias WHERE Id = @id');
  return result.recordset.length > 0;
}

module.exports = { listCategorias, listStatus, categoriaExists };
