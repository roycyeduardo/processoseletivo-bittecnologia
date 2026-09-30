const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middlewares/auth');

/** Monta todas as rotas da API a partir dos controllers. */
function createRoutes({
  authController, solicitacaoController, dominioController, usuarioController,
}) {
  const router = Router();
  const h = asyncHandler;

  // Autenticação (login é a única rota pública)
  router.post('/auth/login', h(authController.login));
  router.post('/auth/logout', requireAuth, authController.logout);
  router.get('/auth/me', requireAuth, authController.me);

  // Daqui em diante, todas as rotas exigem sessão ativa
  router.use(requireAuth);

  router.get('/categorias', h(dominioController.categorias));
  router.get('/status', h(dominioController.status));
  router.get('/dashboard', h(solicitacaoController.dashboard));

  router.get('/solicitacoes', h(solicitacaoController.listar));
  router.post('/solicitacoes', h(solicitacaoController.criar));
  router.get('/solicitacoes/:id', h(solicitacaoController.detalhar));
  router.put('/solicitacoes/:id', h(solicitacaoController.atualizar));
  router.delete('/solicitacoes/:id', h(solicitacaoController.excluir));
  router.patch('/solicitacoes/:id/status', h(solicitacaoController.alterarStatus));

  // Gestão de usuários (perfil ADMINISTRADOR, verificado no serviço)
  router.get('/usuarios', h(usuarioController.listar));
  router.post('/usuarios', h(usuarioController.criar));

  return router;
}

module.exports = createRoutes;
