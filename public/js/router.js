/**
 * Roteador por hash (#/caminho). Cada rota é um padrão com parâmetros
 * no formato ":nome", associado a uma função de renderização.
 */
export function createRouter(routes, { onNotFound, beforeEach }) {
  const compiled = routes.map((route) => {
    const keys = [];
    const pattern = route.path.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    return { ...route, regex: new RegExp(`^${pattern}$`), keys };
  });

  function resolve() {
    const [path, queryString = ''] = (location.hash.slice(1) || '/').split('?');
    const query = Object.fromEntries(new URLSearchParams(queryString));

    for (const route of compiled) {
      const match = path.match(route.regex);
      if (match) {
        const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
        if (beforeEach && beforeEach(route) === false) return;
        route.view({ params, query });
        return;
      }
    }
    onNotFound();
  }

  window.addEventListener('hashchange', resolve);

  return {
    start: resolve,
    navigate: (path) => {
      if (location.hash === `#${path}`) resolve();
      else location.hash = path;
    },
  };
}
