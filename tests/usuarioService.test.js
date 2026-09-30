const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const createUsuarioService = require('../src/services/usuarioService');
const { createFakeRepositories, usuarios } = require('./fakes');

const NOVO = { nome: 'Ana Lima', login: 'ana', senha: 'segredo1', perfil: 'SOLICITANTE' };

const rejeitaCom = (promise, statusCode) => assert.rejects(promise, (err) => {
  assert.equal(err.statusCode, statusCode, err.message);
  return true;
});

describe('usuarioService', () => {
  let service;
  let repos;

  beforeEach(() => {
    repos = createFakeRepositories();
    service = createUsuarioService(repos);
  });

  it('administrador cadastra usuário e a senha é gravada como hash bcrypt', async () => {
    const criado = await service.criar(NOVO, usuarios.admin);
    assert.equal(criado.login, 'ana');
    assert.equal(criado.senhaHash, undefined, 'não deve devolver o hash');

    const salvo = await repos.usuarioRepository.findByLogin('ana');
    assert.notEqual(salvo.senhaHash, NOVO.senha);
    assert.ok(await bcrypt.compare(NOVO.senha, salvo.senhaHash));
  });

  it('normaliza o login para minúsculas e o perfil para maiúsculas', async () => {
    const criado = await service.criar({ ...NOVO, login: '  Ana.Lima ', perfil: 'atendente' }, usuarios.admin);
    assert.equal(criado.login, 'ana.lima');
    assert.equal(criado.perfil, 'ATENDENTE');
  });

  it('apenas o perfil ADMINISTRADOR lista e cadastra usuários', async () => {
    await rejeitaCom(service.criar(NOVO, usuarios.atendente), 403);
    await rejeitaCom(service.criar(NOVO, usuarios.maria), 403);
    await rejeitaCom(service.listar(usuarios.atendente), 403);
    assert.ok((await service.listar(usuarios.admin)).length > 0);
  });

  it('rejeita login já existente com 409', async () => {
    await rejeitaCom(service.criar({ ...NOVO, login: 'MARIA' }, usuarios.admin), 409);
  });

  it('valida todos os campos', async () => {
    await assert.rejects(
      service.criar({ nome: 'A', login: 'a b', senha: '123', perfil: 'CHEFE' }, usuarios.admin),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.deepEqual(Object.keys(err.details).sort(), ['login', 'nome', 'perfil', 'senha']);
        return true;
      },
    );
  });

  it('rejeita senha acima de 72 bytes (limite do bcrypt)', async () => {
    await rejeitaCom(service.criar({ ...NOVO, senha: 'x'.repeat(73) }, usuarios.admin), 400);
  });
});
