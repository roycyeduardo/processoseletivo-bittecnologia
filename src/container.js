/**
 * Composição das dependências (injeção manual): repositórios -> serviços -> controllers.
 * Os testes montam a aplicação com repositórios falsos, sem banco de dados.
 */
const createAuthService = require('./services/authService');
const createSolicitacaoService = require('./services/solicitacaoService');
const createUsuarioService = require('./services/usuarioService');
const createAuthController = require('./controllers/authController');
const createSolicitacaoController = require('./controllers/solicitacaoController');
const createDominioController = require('./controllers/dominioController');
const createUsuarioController = require('./controllers/usuarioController');

function createContainer({ usuarioRepository, solicitacaoRepository, dominioRepository }) {
  const authService = createAuthService({ usuarioRepository });
  const solicitacaoService = createSolicitacaoService({ solicitacaoRepository, dominioRepository });
  const usuarioService = createUsuarioService({ usuarioRepository });

  return {
    authController: createAuthController({ authService }),
    solicitacaoController: createSolicitacaoController({ solicitacaoService }),
    dominioController: createDominioController({ dominioRepository }),
    usuarioController: createUsuarioController({ usuarioService }),
  };
}

function defaultRepositories() {
  return {
    usuarioRepository: require('./repositories/usuarioRepository'),
    solicitacaoRepository: require('./repositories/solicitacaoRepository'),
    dominioRepository: require('./repositories/dominioRepository'),
  };
}

module.exports = { createContainer, defaultRepositories };
