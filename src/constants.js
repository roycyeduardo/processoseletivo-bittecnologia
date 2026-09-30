/** Status das solicitações — espelham a tabela StatusSolicitacao. */
const STATUS = Object.freeze({
  ABERTO: 1,
  EM_ATENDIMENTO: 2,
  CONCLUIDO: 3,
});

/**
 * Transições de status permitidas (máquina de estados).
 * Concluído é um estado final.
 */
const TRANSICOES_STATUS = Object.freeze({
  [STATUS.ABERTO]: [STATUS.EM_ATENDIMENTO],
  [STATUS.EM_ATENDIMENTO]: [STATUS.ABERTO, STATUS.CONCLUIDO],
  [STATUS.CONCLUIDO]: [],
});

const PERFIS = Object.freeze({
  SOLICITANTE: 'SOLICITANTE',
  ATENDENTE: 'ATENDENTE',
  ADMINISTRADOR: 'ADMINISTRADOR',
});

/** Perfis que podem alterar o status das solicitações. */
const PERFIS_ATENDIMENTO = Object.freeze([PERFIS.ATENDENTE, PERFIS.ADMINISTRADOR]);

module.exports = { STATUS, TRANSICOES_STATUS, PERFIS, PERFIS_ATENDIMENTO };
