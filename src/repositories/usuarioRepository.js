const { sql, getPool } = require('../config/database');

async function findByLogin(login) {
  const pool = await getPool();
  const result = await pool.request()
    .input('login', sql.VarChar(50), login)
    .query(`
      SELECT Id AS id, Nome AS nome, Login AS login, SenhaHash AS senhaHash,
             Perfil AS perfil, Ativo AS ativo
        FROM dbo.Usuarios
       WHERE Login = @login`);
  return result.recordset[0] || null;
}

/** Lista os usuários sem o hash da senha. */
async function list() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT Id AS id, Nome AS nome, Login AS login, Perfil AS perfil,
           Ativo AS ativo, DataCriacao AS dataCriacao
      FROM dbo.Usuarios
     ORDER BY Nome`);
  return result.recordset;
}

/** Cria o usuário e retorna seus dados públicos. */
async function create({ nome, login, senhaHash, perfil }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('nome', sql.NVarChar(100), nome)
    .input('login', sql.VarChar(50), login)
    .input('senhaHash', sql.VarChar(100), senhaHash)
    .input('perfil', sql.VarChar(20), perfil)
    .query(`
      INSERT INTO dbo.Usuarios (Nome, Login, SenhaHash, Perfil)
      OUTPUT INSERTED.Id AS id, INSERTED.Nome AS nome, INSERTED.Login AS login,
             INSERTED.Perfil AS perfil, INSERTED.Ativo AS ativo, INSERTED.DataCriacao AS dataCriacao
      VALUES (@nome, @login, @senhaHash, @perfil)`);
  return result.recordset[0];
}

module.exports = { findByLogin, list, create };
