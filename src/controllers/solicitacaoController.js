function createSolicitacaoController({ solicitacaoService }) {
  return {
    async listar(req, res) {
      res.json(await solicitacaoService.listar(req.query));
    },

    async detalhar(req, res) {
      res.json(await solicitacaoService.detalhar(req.params.id, req.session.usuario));
    },

    async criar(req, res) {
      const solicitacao = await solicitacaoService.criar(req.body, req.session.usuario);
      res.status(201).location(`/api/solicitacoes/${solicitacao.id}`).json(solicitacao);
    },

    async atualizar(req, res) {
      res.json(await solicitacaoService.atualizar(req.params.id, req.body, req.session.usuario));
    },

    async excluir(req, res) {
      await solicitacaoService.excluir(req.params.id, req.session.usuario);
      res.status(204).end();
    },

    async alterarStatus(req, res) {
      res.json(await solicitacaoService.alterarStatus(req.params.id, req.body, req.session.usuario));
    },

    async dashboard(req, res) {
      res.json(await solicitacaoService.dashboard());
    },
  };
}

module.exports = createSolicitacaoController;
