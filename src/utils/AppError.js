/** Erro de negócio/validação com status HTTP associado. */
class AppError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) { return new AppError(message, 400, details); }
  static unauthorized(message = 'Não autenticado.') { return new AppError(message, 401); }
  static forbidden(message = 'Acesso negado.') { return new AppError(message, 403); }
  static notFound(message = 'Recurso não encontrado.') { return new AppError(message, 404); }
  static conflict(message, details) { return new AppError(message, 409, details); }
}

module.exports = AppError;
