const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { requiredString, assertValid } = require('../utils/validators');
const { PERFIS } = require('../constants');

const BCRYPT_ROUNDS = 10;
const LOGIN_REGEX = /^[a-z0-9._-]+$/;
// Códigos de erro do SQL Server para violação de UNIQUE/PRIMARY KEY.
const SQL_DUPLICATE_KEY = [2627, 2601];

function createUsuarioService({ usuarioRepository }) {
  function garantirAdministrador(usuario) {
    if (usuario.perfil !== PERFIS.ADMINISTRADOR) {
      throw AppError.forbidden('Apenas administradores podem gerenciar usuários.');
    }
  }

  function validarDados(body = {}) {
    const errors = {};
    const dados = {
      nome: requiredString(errors, 'nome', body.nome, { label: 'Nome', min: 3, max: 100 }),
      login: requiredString(errors, 'login', body.login, { label: 'Usuário', min: 3, max: 50 }).toLowerCase(),
      perfil: typeof body.perfil === 'string' ? body.perfil.trim().toUpperCase() : '',
    };

    if (!errors.login && !LOGIN_REGEX.test(dados.login)) {
      errors.login = 'Use apenas letras minúsculas, números, ponto, hífen ou sublinhado.';
    }
    if (!Object.values(PERFIS).includes(dados.perfil)) {
      errors.perfil = 'Perfil inválido.';
    }

    // Senha não passa por trim: espaços fazem parte dela.
    const senha = typeof body.senha === 'string' ? body.senha : '';
    if (senha.length < 6) {
      errors.senha = 'Senha deve ter ao menos 6 caracteres.';
    } else if (Buffer.byteLength(senha) > 72) {
      errors.senha = 'Senha deve ter no máximo 72 caracteres.'; // limite do bcrypt
    }

    assertValid(errors);
    return { ...dados, senha };
  }

  async function listar(usuarioLogado) {
    garantirAdministrador(usuarioLogado);
    return usuarioRepository.list();
  }

  async function criar(body, usuarioLogado) {
    garantirAdministrador(usuarioLogado);
    const { senha, ...dados } = validarDados(body);

    if (await usuarioRepository.findByLogin(dados.login)) {
      throw AppError.conflict('Já existe um usuário com este login.', { login: 'Login já utilizado.' });
    }

    const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS);
    try {
      return await usuarioRepository.create({ ...dados, senhaHash });
    } catch (err) {
      // Dois cadastros simultâneos com o mesmo login: a constraint UNIQUE do banco decide.
      if (SQL_DUPLICATE_KEY.includes(err.number)) {
        throw AppError.conflict('Já existe um usuário com este login.', { login: 'Login já utilizado.' });
      }
      throw err;
    }
  }

  return { listar, criar };
}

module.exports = createUsuarioService;
