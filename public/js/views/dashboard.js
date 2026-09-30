import { api } from '../api.js';
import { html, render, loading, errorState } from '../ui.js';
import { tabelaSolicitacoes, bindLinhas } from './tabela.js';

export async function dashboardView({ el, state, navigate }) {
  loading(el);

  try {
    const [indicadores, recentes] = await Promise.all([api.dashboard(), api.listar()]);

    const card = (valor, rotulo, href) => html`
      <a class="card" href="${href}">
        <div class="num">${valor}</div>
        <div class="lbl">${rotulo}</div>
      </a>`;

    render(el, html`
      <div class="page-head">
        <h1>Olá, ${state.usuario.nome.split(' ')[0]}</h1>
        <a class="btn" href="#/solicitacoes/nova">Nova solicitação</a>
      </div>

      <div class="cards">
        ${card(indicadores.total, 'Total', '#/solicitacoes')}
        ${card(indicadores.abertas, 'Abertas', '#/solicitacoes?statusId=1')}
        ${card(indicadores.emAtendimento, 'Em atendimento', '#/solicitacoes?statusId=2')}
        ${card(indicadores.concluidas, 'Concluídas', '#/solicitacoes?statusId=3')}
      </div>

      <h2>Recentes</h2>
      ${tabelaSolicitacoes(recentes.slice(0, 5))}
    `);

    bindLinhas(el, navigate);
  } catch (err) {
    errorState(el, err);
  }
}
