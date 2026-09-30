const AppError = require('./AppError');

/**
 * Validações reutilizáveis. Cada função recebe o valor bruto e devolve o valor
 * normalizado, acumulando mensagens de erro em `errors` (campo -> mensagem).
 */
function requiredString(errors, field, value, { label, min = 1, max }) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min) {
    errors[field] = min > 1 ? `${label} deve ter ao menos ${min} caracteres.` : `${label}: campo obrigatório.`;
  } else if (max && text.length > max) {
    errors[field] = `${label} deve ter no máximo ${max} caracteres.`;
  }
  return text;
}

function optionalString(value, max = 200) {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text ? text.slice(0, max) : undefined;
}

function positiveInt(errors, field, value, { label, required = true }) {
  if (value === undefined || value === null || value === '') {
    if (required) errors[field] = `${label}: campo obrigatório.`;
    return undefined;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    errors[field] = `${label} inválido.`;
    return undefined;
  }
  return number;
}

/** Aceita datas no formato AAAA-MM-DD. */
function optionalDate(errors, field, value, { label }) {
  if (!value) return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    errors[field] = `${label} inválida (use AAAA-MM-DD).`;
    return undefined;
  }
  return value;
}

function assertValid(errors) {
  if (Object.keys(errors).length > 0) {
    throw AppError.badRequest('Dados inválidos.', errors);
  }
}

module.exports = { requiredString, optionalString, positiveInt, optionalDate, assertValid };
