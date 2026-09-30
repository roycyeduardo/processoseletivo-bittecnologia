import { api, setUnauthorizedHandler } from './api.js';
import { createRouter } from './router.js';
import { html, render, toast } from './ui.js';
import { loginView } from './views/login.js';
import { dashboardView } from './views/dashboard.js';
import { listaView } from './views/lista.js';
import { formView } from './views/form.js';
import { detalheView } from './views/detalhe.js';
import { usuariosView, usuarioFormView } from './views/usuarios.js';

const app = document.getElementById('app');
const topbar = document.getElementById('topbar');

/** Estado global mínimo: usuário logado e listas de domínio (cacheadas). */
const state = {
  usuario: null,
  dominios: null,
};

async function carregarDominios() {
  if (!state.dominios) {
    const [categorias, status] = await Promise.all([api.categorias(), api.status()]);
    state.dominios = { categorias, status };
  }
  return state.dominios;
}

function setUsuario(usuario) {
  state.usuario = usuario;
  topbar.hidden = !usuario;
  document.getElementById('user-name').textContent = usuario ? usuario.nome : '';
  // Links restritos a um perfil (ex.: Usuários) só aparecem para ele.
  document.querySelectorAll('[data-perfil]').forEach((link) => {
    link.hidden = !usuario || usuario.perfil !== link.dataset.perfil;
  });
  if (!usuario) state.dominios = null;
}

/** Envolve uma view, injetando o contexto comum. */
const page = (view) => ({ params, query }) => view({
  el: app, params, query, state, carregarDominios, navigate: (path) => router.navigate(path),
});

const router = createRouter([
  { path: '/login', view: page(loginView), nav: null }, // única rota pública
  { path: '/', view: page(dashboardView), nav: 'dashboard' },
  { path: '/solicitacoes', view: page(listaView), nav: 'solicitacoes' },
  { path: '/solicitacoes/nova', view: page(formView), nav: 'nova' },
  { path: '/solicitacoes/:id/editar', view: page(formView), nav: 'solicitacoes' },
  { path: '/solicitacoes/:id', view: page(detalheView), nav: 'solicitacoes' },
  { path: '/usuarios', view: page(usuariosView), nav: 'usuarios', perfil: 'ADMINISTRADOR' },
  { path: '/usuarios/novo', view: page(usuarioFormView), nav: 'usuarios', perfil: 'ADMINISTRADOR' },
], {
  beforeEach(route) {
    // Guarda de rota: sem sessão, qualquer rota leva ao login.
    if (!state.usuario && route.nav !== null) {
      router.navigate('/login');
      return false;
    }
    // Rotas restritas a um perfil (a API também valida; aqui só evita a tela vazia).
    if (route.perfil && state.usuario.perfil !== route.perfil) {
      toast('Você não tem permissão para acessar esta página.', 'error');
      router.navigate('/');
      return false;
    }
    document.querySelectorAll('[data-nav]').forEach((a) => {
      a.classList.toggle('active', a.dataset.nav === route.nav);
    });
    window.scrollTo(0, 0);
    return true;
  },
  onNotFound() {
    render(app, html`<h1>Página não encontrada</h1><p><a href="#/">Voltar ao painel</a></p>`);
  },
});

setUnauthorizedHandler(() => {
  setUsuario(null);
  toast('Sua sessão expirou. Entre novamente.', 'error');
  router.navigate('/login');
});

document.getElementById('logout').addEventListener('click', async () => {
  try {
    await api.logout();
  } finally {
    setUsuario(null);
    router.navigate('/login');
  }
});

// Eventos disparados pela tela de login.
window.addEventListener('auth:login', (event) => {
  setUsuario(event.detail);
  router.navigate('/');
});

// Inicialização: verifica se já existe sessão ativa.
(async () => {
  try {
    setUsuario(await api.me());
  } catch {
    setUsuario(null);
  }
  router.start();
})();
