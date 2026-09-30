const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const createSolicitacaoService = require('../src/services/solicitacaoService');
const { STATUS } = require('../src/constants');
const { createFakeRepositories, usuarios } = require('./fakes');

const DADOS_VALIDOS = { titulo: 'Impressora parada', descricao: 'A impressora do 2º andar não imprime.', categoriaId: 1 };

/** Verifica que a promise rejeita com um AppError do status HTTP esperado. */
const rejeitaCom = (promise, statusCode) => assert.rejects(promise, (err) => {
  assert.equal(err.statusCode, statusCode, err.message);
  return true;
});

describe('solicitacaoService', () => {
  let service;

  beforeEach(() => {
    service = createSolicitacaoService(createFakeRepositories());
  });

  describe('criar', () => {
    it('cria com status Aberto e o usuário logado como solicitante', async () => {
      const s = await service.criar(DADOS_VALIDOS, usuarios.maria);
      assert.equal(s.statusId, STATUS.ABERTO);
      assert.equal(s.usuarioId, usuarios.maria.id);
      assert.equal(s.titulo, DADOS_VALIDOS.titulo);
    });

    it('remove espaços extras do título e da descrição', async () => {
      const s = await service.criar({ ...DADOS_VALIDOS, titulo: '  Título  ' }, usuarios.maria);
      assert.equal(s.titulo, 'Título');
    });

    it('rejeita dados inválidos informando cada campo', async () => {
      await assert.rejects(service.criar({ titulo: 'a', descricao: '', categoriaId: 'x' }, usuarios.maria), (err) => {
        assert.equal(err.statusCode, 400);
        assert.deepEqual(Object.keys(err.details).sort(), ['categoriaId', 'descricao', 'titulo']);
        return true;
      });
    });

    it('rejeita categoria inexistente', async () => {
      await rejeitaCom(service.criar({ ...DADOS_VALIDOS, categoriaId: 99 }, usuarios.maria), 400);
    });

    it('ignora status e solicitante enviados pelo cliente', async () => {
      const s = await service.criar({ ...DADOS_VALIDOS, statusId: 3, usuarioId: 99 }, usuarios.maria);
      assert.equal(s.statusId, STATUS.ABERTO);
      assert.equal(s.usuarioId, usuarios.maria.id);
    });
  });

  describe('editar e excluir', () => {
    it('permite ao solicitante editar enquanto Aberta', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);
      const s = await service.atualizar(id, { ...DADOS_VALIDOS, titulo: 'Novo título' }, usuarios.maria);
      assert.equal(s.titulo, 'Novo título');
    });

    it('impede outro usuário de editar ou excluir', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);
      await rejeitaCom(service.atualizar(id, DADOS_VALIDOS, usuarios.outro), 403);
      await rejeitaCom(service.excluir(id, usuarios.outro), 403);
    });

    it('impede editar ou excluir quando não está Aberta', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);
      await service.alterarStatus(id, { statusId: STATUS.EM_ATENDIMENTO }, usuarios.atendente);
      await rejeitaCom(service.atualizar(id, DADOS_VALIDOS, usuarios.maria), 409);
      await rejeitaCom(service.excluir(id, usuarios.maria), 409);
    });

    it('exclui solicitação aberta do próprio usuário', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);
      await service.excluir(id, usuarios.maria);
      await rejeitaCom(service.detalhar(id, usuarios.maria), 404);
    });

    it('retorna 404 para código inexistente e 400 para código inválido', async () => {
      await rejeitaCom(service.detalhar(999, usuarios.maria), 404);
      await rejeitaCom(service.detalhar('abc', usuarios.maria), 400);
    });
  });

  describe('alterarStatus', () => {
    it('segue o fluxo Aberto → Em Atendimento → Concluído', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);
      await service.alterarStatus(id, { statusId: STATUS.EM_ATENDIMENTO }, usuarios.atendente);
      const s = await service.alterarStatus(id, { statusId: STATUS.CONCLUIDO }, usuarios.atendente);
      assert.equal(s.statusId, STATUS.CONCLUIDO);

      const detalhe = await service.detalhar(id, usuarios.atendente);
      assert.equal(detalhe.historico.length, 3);
    });

    it('não permite pular de Aberto direto para Concluído', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);
      await rejeitaCom(service.alterarStatus(id, { statusId: STATUS.CONCLUIDO }, usuarios.atendente), 409);
    });

    it('não permite reabrir uma solicitação concluída', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);
      await service.alterarStatus(id, { statusId: STATUS.EM_ATENDIMENTO }, usuarios.atendente);
      await service.alterarStatus(id, { statusId: STATUS.CONCLUIDO }, usuarios.atendente);
      await rejeitaCom(service.alterarStatus(id, { statusId: STATUS.ABERTO }, usuarios.atendente), 409);
    });

    it('permite apenas ao perfil ATENDENTE', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);
      await rejeitaCom(service.alterarStatus(id, { statusId: STATUS.EM_ATENDIMENTO }, usuarios.maria), 403);
    });
  });

  describe('detalhar (permissões para a interface)', () => {
    it('informa as ações disponíveis para cada usuário', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);

      const doDono = await service.detalhar(id, usuarios.maria);
      assert.equal(doDono.podeEditar, true);
      assert.deepEqual(doDono.statusPermitidos, []);

      const doAtendente = await service.detalhar(id, usuarios.atendente);
      assert.equal(doAtendente.podeEditar, false);
      assert.deepEqual(doAtendente.statusPermitidos, [STATUS.EM_ATENDIMENTO]);
    });
  });

  describe('listar e dashboard', () => {
    it('valida o período informado', async () => {
      await rejeitaCom(service.listar({ dataInicio: '2026-10-10', dataFim: '2026-10-01' }), 400);
      await rejeitaCom(service.listar({ dataInicio: '10/10/2026' }), 400);
    });

    it('filtra por status e texto', async () => {
      await service.criar(DADOS_VALIDOS, usuarios.maria);
      await service.criar({ ...DADOS_VALIDOS, titulo: 'Férias' }, usuarios.maria);
      const resultado = await service.listar({ texto: 'férias', statusId: '1' });
      assert.equal(resultado.length, 1);
    });

    it('conta as solicitações por status', async () => {
      const { id } = await service.criar(DADOS_VALIDOS, usuarios.maria);
      await service.criar(DADOS_VALIDOS, usuarios.maria);
      await service.alterarStatus(id, { statusId: STATUS.EM_ATENDIMENTO }, usuarios.atendente);

      assert.deepEqual(await service.dashboard(), { total: 2, abertas: 1, emAtendimento: 1, concluidas: 0 });
    });
  });
});
