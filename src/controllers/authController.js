function createAuthController({ authService }) {
  async function login(req, res) {
    const usuario = await authService.autenticar(req.body);
    // Gera um novo id de sessão no login (proteção contra fixação de sessão).
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.usuario = usuario;
    res.json(usuario);
  }

  function logout(req, res, next) {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('sid');
      return res.status(204).end();
    });
  }

  function me(req, res) {
    res.json(req.session.usuario);
  }

  return { login, logout, me };
}

module.exports = createAuthController;
