const AppError = require('../utils/AppError');
const {
  requiredString, optionalString, positiveInt, optionalDate, assertValid,
} = require('../utils/validators');
const { STATUS, TRANSICOES_STATUS, PERFIS_ATENDIMENTO } = require('../constants');

function createSolicitacaoService({ solicitacaoRepository, dominioRepository }) {
  /* ---------- validação de entrada ---------- */

  async function validarDados(body = {}) {
    const errors = {};
    const dados = {
      titulo: requiredString(errors, 'titulo', body.titulo, { label: 'Título', min: 3, max: 150 }),
      descricao: requiredString(errors, 'descricao', body.descricao, { label: 'Descrição', min: 5, max: 2000 }),
      categoriaId: positiveInt(errors, 'categoriaId', body.categoriaId, { label: 'Categoria' }),
    };
    if (!errors.categoriaId && !(await dominioRepository.categoriaExists(dados.categoriaId))) {
      errors.categoriaId = 'Categoria inexistente.';
    }
    assertValid(errors);
    return dados;
  }

  function validarId(value) {
    const errors = {};
    const id = positiveInt(errors, 'id', value, { label: 'Código' });
    assertValid(errors);
    return id;
  }

  function validarFiltros(query = {}) {
    const errors = {};
    const filtros = {
      dataInicio: optionalDate(errors, 'dataInicio', query.dataInicio, { label: 'Data inicial' }),
      dataFim: optionalDate(errors, 'dataFim', query.dataFim, { label: 'Data final' }),
      categoriaId: positiveInt(errors, 'categoriaId', query.categoriaId, { label: 'Categoria', required: false }),
      statusId: positiveInt(errors, 'statusId', query.statusId, { label: 'Status', required: false }),
      texto: optionalString(query.texto, 150),
    };
    if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) {
      errors.dataFim = 'Data final deve ser posterior à data inicial.';
    }
    assertValid(errors);
    return filtros;
  }

  /* ---------- regras de negócio ---------- */

  async function obterOuFalhar(id) {
    const solicitacao = await solicitacaoRepository.findById(id);
    if (!solicitacao) throw AppError.notFound('Solicitação não encontrada.');
    return solicitacao;
  }

  /** Somente o solicitante pode editar/excluir, e apenas enquanto estiver Aberta. */
  function garantirEditavel(solicitacao, usuario) {
    if (solicitacao.usuarioId !== usuario.id) {
      throw AppError.forbidden('Apenas o solicitante pode alterar esta solicitação.');
    }
    if (solicitacao.statusId !== STATUS.ABERTO) {
      throw AppError.conflict('Somente solicitações com status "Aberto" podem ser alteradas.');
    }
  }

  /** Indica, para o frontend, quais ações o usuário pode executar. */
  function permissoes(solicitacao, usuario) {
    const dono = solicitacao.usuarioId === usuario.id;
    const aberta = solicitacao.statusId === STATUS.ABERTO;
    return {
      podeEditar: dono && aberta,
      podeExcluir: dono && aberta,
      statusPermitidos: PERFIS_ATENDIMENTO.includes(usuario.perfil) ? TRANSICOES_STATUS[solicitacao.statusId] || [] : [],
    };
  }

  /* ---------- casos de uso ---------- */

  async function listar(query) {
    return solicitacaoRepository.list(validarFiltros(query));
  }

  async function detalhar(idParam, usuario) {
    const id = validarId(idParam);
    const solicitacao = await obterOuFalhar(id);
    const historico = await solicitacaoRepository.listHistorico(id);
    return { ...solicitacao, historico, ...permissoes(solicitacao, usuario) };
  }

  async function criar(body, usuario) {
    const dados = await validarDados(body);
    const id = await solicitacaoRepository.create({ ...dados, statusId: STATUS.ABERTO, usuarioId: usuario.id });
    return solicitacaoRepository.findById(id);
  }

  async function atualizar(idParam, body, usuario) {
    const id = validarId(idParam);
    garantirEditavel(await obterOuFalhar(id), usuario);
    const dados = await validarDados(body);

    const alterou = await solicitacaoRepository.update(id, dados, STATUS.ABERTO);
    if (!alterou) throw AppError.conflict('A solicitação foi alterada por outro usuário. Recarregue a página.');
    return solicitacaoRepository.findById(id);
  }

  async function excluir(idParam, usuario) {
    const id = validarId(idParam);
    garantirEditavel(await obterOuFalhar(id), usuario);

    const removeu = await solicitacaoRepository.remove(id, STATUS.ABERTO);
    if (!removeu) throw AppError.conflict('A solicitação foi alterada por outro usuário. Recarregue a página.');
  }

  async function alterarStatus(idParam, body = {}, usuario) {
    if (!PERFIS_ATENDIMENTO.includes(usuario.perfil)) {
      throw AppError.forbidden('Apenas atendentes e administradores podem alterar o status.');
    }
    const id = validarId(idParam);
    const errors = {};
    const statusNovo = positiveInt(errors, 'statusId', body.statusId, { label: 'Status' });
    assertValid(errors);

    const solicitacao = await obterOuFalhar(id);
    const permitidos = TRANSICOES_STATUS[solicitacao.statusId] || [];
    if (!permitidos.includes(statusNovo)) {
      throw AppError.conflict(`Transição de status não permitida a partir de "${solicitacao.status}".`);
    }

    const alterou = await solicitacaoRepository.updateStatus(id, solicitacao.statusId, statusNovo, usuario.id);
    if (!alterou) throw AppError.conflict('A solicitação foi alterada por outro usuário. Recarregue a página.');
    return solicitacaoRepository.findById(id);
  }

  async function dashboard() {
    const linhas = await solicitacaoRepository.countByStatus();
    const porStatus = (statusId) => linhas.find((l) => l.statusId === statusId)?.quantidade || 0;
    return {
      total: linhas.reduce((soma, l) => soma + l.quantidade, 0),
      abertas: porStatus(STATUS.ABERTO),
      emAtendimento: porStatus(STATUS.EM_ATENDIMENTO),
      concluidas: porStatus(STATUS.CONCLUIDO),
    };
  }

  return { listar, detalhar, criar, atualizar, excluir, alterarStatus, dashboard };
}

module.exports = createSolicitacaoService;
