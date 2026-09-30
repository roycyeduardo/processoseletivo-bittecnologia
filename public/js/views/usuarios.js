import { api } from '../api.js';
import {
  html, render, loading, errorState, showFieldErrors, toast, formatDate,
} from '../ui.js';

const PERFIS = [
  { valor: 'SOLICITANTE', nome: 'Solicitante', descricao: 'Abre e acompanha as próprias solicitações' },
  { valor: 'ATENDENTE', nome: 'Atendente', descricao: 'Também altera o status das solicitações' },
  { valor: 'ADMINISTRADOR', nome: 'Administrador', descricao: 'Atende solicitações e gerencia usuários' },
];

const nomePerfil = (valor) => PERFIS.find((p) => p.valor === valor)?.nome || valor;

/** Listagem de usuários (#/usuarios). */
export async function usuariosView({ el }) {
  loading(el);

  let usuarios;
  try {
    usuarios = await api.usuarios();
  } catch (err) {
    errorState(el, err);
    return;
  }

  render(el, html`
    <div class="page-head">
      <h1>Usuários</h1>
      <a class="btn" href="#/usuarios/novo">Novo usuário</a>
    </div>

    <div class="table-wrap">
      <table class="static">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuário</th>
            <th>Perfil</th>
            <th>Situação</th>
            <th>Cadastro</th>
          </tr>
        </thead>
        <tbody>
          ${usuarios.map((u) => html`
            <tr>
              <td class="title">${u.nome}</td>
              <td class="num-col">${u.login}</td>
              <td>${nomePerfil(u.perfil)}</td>
              <td class="${u.ativo ? '' : 'muted'}">${u.ativo ? 'Ativo' : 'Inativo'}</td>
              <td class="num-col">${formatDate(u.dataCriacao)}</td>
            </tr>`)}
        </tbody>
      </table>
    </div>
  `);
}

/** Cadastro de usuário (#/usuarios/novo). */
export function usuarioFormView({ el, navigate }) {
  render(el, html`
    <a class="back" href="#/usuarios">← Usuários</a>
    <div class="page-head">
      <h1>Novo usuário</h1>
    </div>

    <form class="form" id="form-usuario" novalidate autocomplete="off">
      <div id="form-alert"></div>
      <div class="field">
        <label for="nome">Nome completo</label>
        <input id="nome" name="nome" maxlength="100" required>
        <div class="error"></div>
      </div>
      <div class="field">
        <label for="login">Usuário (login)</label>
        <input id="login" name="login" maxlength="50" required autocapitalize="none" spellcheck="false">
        <div class="error"></div>
      </div>
      <div class="field">
        <label for="senha">Senha inicial</label>
        <input id="senha" name="senha" type="password" minlength="6" maxlength="72" required autocomplete="new-password">
        <div class="error"></div>
      </div>
      <div class="field">
        <label for="perfil">Perfil</label>
        <select id="perfil" name="perfil" required>
          ${PERFIS.map((p) => html`<option value="${p.valor}">${p.nome} — ${p.descricao}</option>`)}
        </select>
        <div class="error"></div>
      </div>
      <div class="actions">
        <button class="btn" type="submit">Cadastrar usuário</button>
        <a class="btn ghost" href="#/usuarios">Cancelar</a>
      </div>
    </form>
  `);

  const form = el.querySelector('#form-usuario');
  const alert = el.querySelector('#form-alert');
  form.querySelector('#nome').focus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type=submit]');
    const dados = Object.fromEntries(new FormData(form));

    alert.innerHTML = '';
    showFieldErrors(form, {});
    button.disabled = true;

    try {
      const criado = await api.criarUsuario({
        nome: dados.nome.trim(),
        login: dados.login.trim(),
        senha: dados.senha,
        perfil: dados.perfil,
      });
      toast(`Usuário "${criado.login}" cadastrado.`);
      navigate('/usuarios');
    } catch (err) {
      // 400 (validação) e 409 (login duplicado) trazem o erro por campo.
      if (Object.keys(err.details).length > 0) showFieldErrors(form, err.details);
      else render(alert, html`<div class="alert">${err.message}</div>`);
      button.disabled = false;
    }
  });
}
