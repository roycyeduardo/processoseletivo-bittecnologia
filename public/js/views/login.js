import { api } from '../api.js';
import { html, render, showFieldErrors } from '../ui.js';

export function loginView({ el, state, navigate }) {
  if (state.usuario) {
    navigate('/');
    return;
  }

  render(el, html`
    <form class="login" id="login-form" novalidate>
      <h1>Portal de Solicitações</h1>
      <p class="muted">Entre com seu usuário e senha.</p>
      <div id="login-alert"></div>
      <div class="field">
        <label for="usuario">Usuário</label>
        <input id="usuario" name="usuario" autocomplete="username" required autofocus>
        <div class="error"></div>
      </div>
      <div class="field">
        <label for="senha">Senha</label>
        <input id="senha" name="senha" type="password" autocomplete="current-password" required>
        <div class="error"></div>
      </div>
      <button class="btn" type="submit">Entrar</button>
      <p class="hint muted">Demonstração: admin, carlos, maria ou joao — senha 123456</p>
    </form>
  `);

  const form = el.querySelector('#login-form');
  const alert = el.querySelector('#login-alert');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type=submit]');
    const { usuario, senha } = Object.fromEntries(new FormData(form));
    alert.innerHTML = '';
    button.disabled = true;

    try {
      const user = await api.login(usuario.trim(), senha);
      window.dispatchEvent(new CustomEvent('auth:login', { detail: user }));
    } catch (err) {
      showFieldErrors(form, err.details);
      if (err.status !== 400) render(alert, html`<div class="alert">${err.message}</div>`);
      button.disabled = false;
    }
  });
}
