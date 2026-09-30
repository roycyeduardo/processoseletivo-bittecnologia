function createUsuarioController({ usuarioService }) {
  return {
    async listar(req, res) {
      res.json(await usuarioService.listar(req.session.usuario));
    },

    async criar(req, res) {
      const usuario = await usuarioService.criar(req.body, req.session.usuario);
      res.status(201).json(usuario);
    },
  };
}

module.exports = createUsuarioController;
