const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { requiredString, assertValid } = require('../utils/validators');

// Hash usado quando o login não existe, para que o tempo de resposta
// não revele se o usuário é válido.
const DUMMY_HASH = '$2b$10$dErYNeUdJ0Rf5hn.UGFwK.5TRxb/Udpos/2IOMvABdHw9SQQZ.MfC';

function createAuthService({ usuarioRepository }) {
  /** Valida credenciais e retorna os dados públicos do usuário. */
  async function autenticar({ usuario, senha } = {}) {
    const errors = {};
    const login = requiredString(errors, 'usuario', usuario, { label: 'Usuário', max: 50 });
    const password = typeof senha === 'string' ? senha : '';
    if (!password) errors.senha = 'Senha é obrigatória.';
    assertValid(errors);

    const user = await usuarioRepository.findByLogin(login);
    const senhaConfere = await bcrypt.compare(password, user ? user.senhaHash : DUMMY_HASH);

    if (!user || !senhaConfere || !user.ativo) {
      throw AppError.unauthorized('Usuário ou senha inválidos.');
    }

    return { id: user.id, nome: user.nome, login: user.login, perfil: user.perfil };
  }

  return { autenticar };
}

module.exports = createAuthService;
