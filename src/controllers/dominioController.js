/** Dados de domínio (listas fixas usadas nos formulários e filtros). */
function createDominioController({ dominioRepository }) {
  return {
    async categorias(req, res) {
      res.json(await dominioRepository.listCategorias());
    },

    async status(req, res) {
      res.json(await dominioRepository.listStatus());
    },
  };
}

module.exports = createDominioController;
