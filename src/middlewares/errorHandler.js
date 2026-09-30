const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(AppError.notFound(`Rota ${req.method} ${req.originalUrl} não encontrada.`));
}

/** Converte qualquer erro em uma resposta JSON padronizada: { erro, detalhes? }. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ erro: err.message, detalhes: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  // Erros inesperados: registra no servidor sem expor detalhes internos ao cliente.
  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { notFound, errorHandler };
