const { sql, getPool } = require('../config/database');

const SELECT_BASE = `
  SELECT s.Id              AS id,
         s.Titulo          AS titulo,
         s.Descricao       AS descricao,
         s.CategoriaId     AS categoriaId,
         c.Nome            AS categoria,
         s.StatusId        AS statusId,
         st.Nome           AS status,
         s.UsuarioId       AS usuarioId,
         u.Nome            AS solicitante,
         s.DataCriacao     AS dataCriacao,
         s.DataAtualizacao AS dataAtualizacao
    FROM dbo.Solicitacoes s
    JOIN dbo.Categorias        c  ON c.Id  = s.CategoriaId
    JOIN dbo.StatusSolicitacao st ON st.Id = s.StatusId
    JOIN dbo.Usuarios          u  ON u.Id  = s.UsuarioId`;

/**
 * Lista solicitações aplicando os filtros informados.
 * Todos os valores vão como parâmetros — nada da entrada do usuário é concatenado no SQL.
 */
async function list(filtros = {}) {
  const pool = await getPool();
  const request = pool.request();
  const where = [];

  if (filtros.dataInicio) {
    request.input('dataInicio', sql.Date, filtros.dataInicio);
    where.push('s.DataCriacao >= @dataInicio');
  }
  if (filtros.dataFim) {
    request.input('dataFim', sql.Date, filtros.dataFim);
    where.push('s.DataCriacao < DATEADD(DAY, 1, CAST(@dataFim AS DATETIME2))');
  }
  if (filtros.categoriaId) {
    request.input('categoriaId', sql.Int, filtros.categoriaId);
    where.push('s.CategoriaId = @categoriaId');
  }
  if (filtros.statusId) {
    request.input('statusId', sql.TinyInt, filtros.statusId);
    where.push('s.StatusId = @statusId');
  }
  if (filtros.texto) {
    // Escapa os curingas do LIKE para buscar o texto literalmente.
    const texto = filtros.texto.replace(/[[%_]/g, '[$&]');
    request.input('texto', sql.NVarChar(210), `%${texto}%`);
    where.push('s.Titulo LIKE @texto');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await request.query(`${SELECT_BASE} ${whereSql} ORDER BY s.DataCriacao DESC, s.Id DESC`);
  return result.recordset;
}

async function findById(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query(`${SELECT_BASE} WHERE s.Id = @id`);
  return result.recordset[0] || null;
}

async function listHistorico(solicitacaoId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, solicitacaoId)
    .query(`
      SELECT h.Id AS id, sa.Nome AS statusAnterior, sn.Nome AS statusNovo,
             u.Nome AS usuario, h.DataAlteracao AS dataAlteracao
        FROM dbo.HistoricoStatus h
        LEFT JOIN dbo.StatusSolicitacao sa ON sa.Id = h.StatusAnteriorId
        JOIN dbo.StatusSolicitacao      sn ON sn.Id = h.StatusNovoId
        JOIN dbo.Usuarios               u  ON u.Id  = h.UsuarioId
       WHERE h.SolicitacaoId = @id
       ORDER BY h.DataAlteracao, h.Id`);
  return result.recordset;
}

/** Executa `work(transaction)` dentro de uma transação, com rollback em caso de erro. */
async function withTransaction(work) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

function insertHistorico(transaction, { solicitacaoId, statusAnterior, statusNovo, usuarioId }) {
  return new sql.Request(transaction)
    .input('id', sql.Int, solicitacaoId)
    .input('statusAnterior', sql.TinyInt, statusAnterior)
    .input('statusNovo', sql.TinyInt, statusNovo)
    .input('usuarioId', sql.Int, usuarioId)
    .query(`
      INSERT INTO dbo.HistoricoStatus (SolicitacaoId, StatusAnteriorId, StatusNovoId, UsuarioId)
      VALUES (@id, @statusAnterior, @statusNovo, @usuarioId)`);
}

/** Cria a solicitação e registra o status inicial no histórico. Retorna o Id gerado. */
async function create({ titulo, descricao, categoriaId, statusId, usuarioId }) {
  return withTransaction(async (transaction) => {
    const result = await new sql.Request(transaction)
      .input('titulo', sql.NVarChar(150), titulo)
      .input('descricao', sql.NVarChar(2000), descricao)
      .input('categoriaId', sql.Int, categoriaId)
      .input('statusId', sql.TinyInt, statusId)
      .input('usuarioId', sql.Int, usuarioId)
      .query(`
        INSERT INTO dbo.Solicitacoes (Titulo, Descricao, CategoriaId, StatusId, UsuarioId)
        OUTPUT INSERTED.Id AS id
        VALUES (@titulo, @descricao, @categoriaId, @statusId, @usuarioId)`);
    const { id } = result.recordset[0];

    await insertHistorico(transaction, {
      solicitacaoId: id, statusAnterior: null, statusNovo: statusId, usuarioId,
    });
    return id;
  });
}

/**
 * Atualiza os dados apenas se a solicitação ainda estiver no status esperado
 * (a condição no WHERE evita corrida entre a verificação e a gravação).
 * Retorna true se a linha foi alterada.
 */
async function update(id, { titulo, descricao, categoriaId }, statusEsperado) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('titulo', sql.NVarChar(150), titulo)
    .input('descricao', sql.NVarChar(2000), descricao)
    .input('categoriaId', sql.Int, categoriaId)
    .input('statusEsperado', sql.TinyInt, statusEsperado)
    .query(`
      UPDATE dbo.Solicitacoes
         SET Titulo = @titulo, Descricao = @descricao, CategoriaId = @categoriaId,
             DataAtualizacao = SYSDATETIME()
       WHERE Id = @id AND StatusId = @statusEsperado`);
  return result.rowsAffected[0] > 0;
}

/** Exclui apenas se a solicitação ainda estiver no status esperado. */
async function remove(id, statusEsperado) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('statusEsperado', sql.TinyInt, statusEsperado)
    .query('DELETE FROM dbo.Solicitacoes WHERE Id = @id AND StatusId = @statusEsperado');
  return result.rowsAffected[0] > 0;
}

/** Altera o status e grava o histórico na mesma transação. Retorna false se o status mudou no meio tempo. */
async function updateStatus(id, statusAtual, statusNovo, usuarioId) {
  return withTransaction(async (transaction) => {
    const result = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .input('statusAtual', sql.TinyInt, statusAtual)
      .input('statusNovo', sql.TinyInt, statusNovo)
      .query(`
        UPDATE dbo.Solicitacoes
           SET StatusId = @statusNovo, DataAtualizacao = SYSDATETIME()
         WHERE Id = @id AND StatusId = @statusAtual`);

    if (result.rowsAffected[0] === 0) return false;

    await insertHistorico(transaction, {
      solicitacaoId: id, statusAnterior: statusAtual, statusNovo, usuarioId,
    });
    return true;
  });
}

async function countByStatus() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT st.Id AS statusId, st.Nome AS status, COUNT(s.Id) AS quantidade
      FROM dbo.StatusSolicitacao st
      LEFT JOIN dbo.Solicitacoes s ON s.StatusId = st.Id
     GROUP BY st.Id, st.Nome
     ORDER BY st.Id`);
  return result.recordset;
}

module.exports = {
  list, findById, listHistorico, create, update, remove, updateStatus, countByStatus,
};
