const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');
const { createFakeRepositories } = require('./fakes');

/** Retorna um agente HTTP já autenticado (mantém o cookie de sessão). */
async function login(app, usuario = 'maria') {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ usuario, senha: '123456' }).expect(200);
  return agent;
}

describe('API', () => {
  let app;

  beforeEach(() => {
    app = createApp(createFakeRepositories());
  });

  describe('autenticação', () => {
    it('bloqueia rotas protegidas sem sessão', async () => {
      const res = await request(app).get('/api/solicitacoes').expect(401);
      assert.ok(res.body.erro);
    });

    it('rejeita senha incorreta, usuário inexistente e usuário inativo com a mesma mensagem', async () => {
      const tentativas = [
        { usuario: 'maria', senha: 'errada' },
        { usuario: 'ninguem', senha: '123456' },
        { usuario: 'inativo', senha: '123456' },
      ];
      for (const credenciais of tentativas) {
        const res = await request(app).post('/api/auth/login').send(credenciais).expect(401);
        assert.equal(res.body.erro, 'Usuário ou senha inválidos.');
      }
    });

    it('valida campos obrigatórios do login', async () => {
      const res = await request(app).post('/api/auth/login').send({}).expect(400);
      assert.ok(res.body.detalhes.usuario);
      assert.ok(res.body.detalhes.senha);
    });

    it('cria sessão com cookie httpOnly e não expõe o hash da senha', async () => {
      const res = await request(app).post('/api/auth/login').send({ usuario: 'maria', senha: '123456' }).expect(200);
      assert.match(res.headers['set-cookie'][0], /HttpOnly/i);
      assert.equal(res.body.senhaHash, undefined);
      assert.equal(res.body.login, 'maria');
    });

    it('encerra a sessão no logout', async () => {
      const agent = await login(app);
      await agent.get('/api/auth/me').expect(200);
      await agent.post('/api/auth/logout').expect(204);
      await agent.get('/api/auth/me').expect(401);
    });
  });

  describe('solicitações', () => {
    it('executa o ciclo completo: criar, listar, editar, excluir', async () => {
      const agent = await login(app);
      const dados = { titulo: 'Trocar mouse', descricao: 'Mouse com defeito.', categoriaId: 1 };

      const criada = await agent.post('/api/solicitacoes').send(dados).expect(201);
      assert.equal(criada.headers.location, `/api/solicitacoes/${criada.body.id}`);

      const lista = await agent.get('/api/solicitacoes').expect(200);
      assert.equal(lista.body.length, 1);

      await agent.put(`/api/solicitacoes/${criada.body.id}`).send({ ...dados, titulo: 'Trocar teclado' }).expect(200);
      await agent.delete(`/api/solicitacoes/${criada.body.id}`).expect(204);
      await agent.get(`/api/solicitacoes/${criada.body.id}`).expect(404);
    });

    it('retorna 400 com detalhes para dados inválidos', async () => {
      const agent = await login(app);
      const res = await agent.post('/api/solicitacoes').send({ titulo: '' }).expect(400);
      assert.ok(res.body.detalhes.titulo);
    });

    it('retorna 400 para JSON malformado', async () => {
      const agent = await login(app);
      await agent.post('/api/solicitacoes').set('Content-Type', 'application/json').send('{ruim').expect(400);
    });

    it('retorna 403 quando solicitante tenta alterar status', async () => {
      const agent = await login(app, 'maria');
      const { body } = await agent.post('/api/solicitacoes')
        .send({ titulo: 'Trocar mouse', descricao: 'Mouse com defeito.', categoriaId: 1 });
      await agent.patch(`/api/solicitacoes/${body.id}/status`).send({ statusId: 2 }).expect(403);

      const atendente = await login(app, 'admin');
      await atendente.patch(`/api/solicitacoes/${body.id}/status`).send({ statusId: 2 }).expect(200);
    });

    it('atendente também altera status', async () => {
      const agent = await login(app, 'maria');
      const { body } = await agent.post('/api/solicitacoes')
        .send({ titulo: 'Trocar mouse', descricao: 'Mouse com defeito.', categoriaId: 1 });
      const atendente = await login(app, 'carlos');
      await atendente.patch(`/api/solicitacoes/${body.id}/status`).send({ statusId: 2 }).expect(200);
    });

    it('retorna 404 em JSON para rota de API inexistente', async () => {
      const agent = await login(app);
      const res = await agent.get('/api/nao-existe').expect(404);
      assert.ok(res.body.erro);
    });
  });

  describe('usuários', () => {
    const novo = { nome: 'Ana Lima', login: 'ana', senha: 'segredo1', perfil: 'SOLICITANTE' };

    it('administrador cadastra um usuário que consegue entrar em seguida', async () => {
      const admin = await login(app, 'admin');
      const res = await admin.post('/api/usuarios').send(novo).expect(201);
      assert.equal(res.body.senhaHash, undefined);

      const lista = await admin.get('/api/usuarios').expect(200);
      assert.ok(lista.body.some((u) => u.login === 'ana'));
      assert.ok(lista.body.every((u) => u.senhaHash === undefined));

      await request(app).post('/api/auth/login').send({ usuario: 'ana', senha: 'segredo1' }).expect(200);
    });

    it('retorna 403 para quem não é administrador', async () => {
      const atendente = await login(app, 'carlos');
      await atendente.get('/api/usuarios').expect(403);
      await atendente.post('/api/usuarios').send(novo).expect(403);
    });

    it('retorna 409 com o campo em conflito para login duplicado', async () => {
      const admin = await login(app, 'admin');
      const res = await admin.post('/api/usuarios').send({ ...novo, login: 'maria' }).expect(409);
      assert.ok(res.body.detalhes.login);
    });
  });
});
