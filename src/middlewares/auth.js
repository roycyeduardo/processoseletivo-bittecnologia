const AppError = require('../utils/AppError');

/** Bloqueia o acesso de quem não possui sessão ativa. */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return next(AppError.unauthorized('Sessão expirada ou inexistente. Faça login.'));
  }
  return next();
}

module.exports = { requireAuth };
