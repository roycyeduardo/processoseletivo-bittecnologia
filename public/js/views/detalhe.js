import { api } from '../api.js';
import {
  html, render, loading, errorState, toast, codigo, formatDateTime, statusBadge,
} from '../ui.js';

export async function detalheView({ el, params, carregarDominios, navigate }) {
  loading(el);

  let s;
  let dominios;
  try {
    [s, dominios] = await Promise.all([api.obter(params.id), carregarDominios()]);
  } catch (err) {
    errorState(el, err);
    return;
  }

  const nomeStatus = (id) => dominios.status.find((st) => st.id === id)?.nome;

  render(el, html`
    <a class="back" href="#/solicitacoes">← Solicitações</a>

    <div class="page-head">
      <div>
        <p class="eyebrow">${codigo(s.id)}</p>
        <h1>${s.titulo}</h1>
      </div>
      <div class="actions">
        ${s.podeEditar && html`<a class="btn ghost" href="#/solicitacoes/${s.id}/editar">Editar</a>`}
        ${s.podeExcluir && html`<button class="btn danger" type="button" id="excluir">Excluir</button>`}
      </div>
    </div>

    <dl class="meta">
      <div><dt>Status</dt><dd>${statusBadge(s.statusId, s.status)}</dd></div>
      <div><dt>Categoria</dt><dd>${s.categoria}</dd></div>
      <div><dt>Solicitante</dt><dd>${s.solicitante}</dd></div>
      <div><dt>Abertura</dt><dd>${formatDateTime(s.dataCriacao)}</dd></div>
    </dl>

    <h2>Descrição</h2>
    <p class="description">${s.descricao}</p>

    ${s.statusPermitidos.length > 0 && html`
      <h2>Atendimento</h2>
      <form class="status-change" id="form-status">
        <label for="novo-status">Alterar status para</label>
        <select id="novo-status" name="statusId">
          ${s.statusPermitidos.map((id) => html`<option value="${id}">${nomeStatus(id)}</option>`)}
        </select>
        <button class="btn" type="submit">Aplicar</button>
      </form>`}

    <h2>Histórico</h2>
    <ul class="timeline">
      ${s.historico.map((h) => html`
        <li>
          <time>${formatDateTime(h.dataAlteracao)}</time>
          <span>${h.statusAnterior ? `${h.statusAnterior} → ${h.statusNovo}` : 'Solicitação registrada'}
            <span class="muted">· ${h.usuario}</span></span>
        </li>`)}
    </ul>
  `);

  el.querySelector('#excluir')?.addEventListener('click', async (event) => {
    if (!window.confirm(`Excluir a solicitação ${codigo(s.id)}? Esta ação não pode ser desfeita.`)) return;
    event.target.disabled = true;
    try {
      await api.excluir(s.id);
      toast('Solicitação excluída.');
      navigate('/solicitacoes');
    } catch (err) {
      toast(err.message, 'error');
      event.target.disabled = false;
    }
  });

  el.querySelector('#form-status')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('button');
    const statusId = Number(event.target.statusId.value);
    button.disabled = true;
    try {
      await api.alterarStatus(s.id, statusId);
      toast(`Status alterado para "${nomeStatus(statusId)}".`);
      detalheView({ el, params, carregarDominios, navigate });
    } catch (err) {
      toast(err.message, 'error');
      button.disabled = false;
    }
  });
}
