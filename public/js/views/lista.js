import { api } from '../api.js';
import { html, render, loading, errorState, showFieldErrors } from '../ui.js';
import { tabelaSolicitacoes, bindLinhas } from './tabela.js';

const CAMPOS_FILTRO = ['texto', 'categoriaId', 'statusId', 'dataInicio', 'dataFim'];

/**
 * Listagem com filtros. Os filtros ficam na URL (#/solicitacoes?statusId=1...),
 * permitindo voltar, recarregar e compartilhar a consulta.
 */
export async function listaView({ el, query, carregarDominios, navigate }) {
  loading(el);

  let dominios;
  try {
    dominios = await carregarDominios();
  } catch (err) {
    errorState(el, err);
    return;
  }

  const option = (item, selecionado) => html`
    <option value="${item.id}" ${String(item.id) === selecionado ? html`selected` : ''}>${item.nome}</option>`;

  render(el, html`
    <div class="page-head">
      <h1>Solicitações</h1>
      <a class="btn" href="#/solicitacoes/nova">Nova solicitação</a>
    </div>

    <form class="filters" id="filtros" novalidate>
      <div class="field">
        <label for="texto">Título</label>
        <input id="texto" name="texto" type="search" placeholder="Buscar…" value="${query.texto || ''}" maxlength="150">
      </div>
      <div class="field">
        <label for="categoriaId">Categoria</label>
        <select id="categoriaId" name="categoriaId">
          <option value="">Todas</option>
          ${dominios.categorias.map((c) => option(c, query.categoriaId))}
        </select>
      </div>
      <div class="field">
        <label for="statusId">Status</label>
        <select id="statusId" name="statusId">
          <option value="">Todos</option>
          ${dominios.status.map((s) => option(s, query.statusId))}
        </select>
      </div>
      <div class="field">
        <label for="dataInicio">De</label>
        <input id="dataInicio" name="dataInicio" type="date" value="${query.dataInicio || ''}">
      </div>
      <div class="field">
        <label for="dataFim">Até</label>
        <input id="dataFim" name="dataFim" type="date" value="${query.dataFim || ''}">
      </div>
      <div class="actions">
        <button class="btn ghost" type="button" id="limpar">Limpar</button>
      </div>
    </form>

    <div id="resultado"></div>
  `);

  const form = el.querySelector('#filtros');
  const resultado = el.querySelector('#resultado');

  // Qualquer alteração nos filtros atualiza a URL, que dispara uma nova consulta.
  const aplicar = () => {
    const dados = Object.fromEntries(new FormData(form));
    const params = new URLSearchParams();
    CAMPOS_FILTRO.forEach((campo) => {
      const valor = (dados[campo] || '').trim();
      if (valor) params.set(campo, valor);
    });
    const qs = params.toString();
    navigate(`/solicitacoes${qs ? `?${qs}` : ''}`);
  };

  let debounce;
  form.addEventListener('input', (event) => {
    clearTimeout(debounce);
    debounce = setTimeout(aplicar, event.target.name === 'texto' ? 350 : 0);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    aplicar();
  });
  el.querySelector('#limpar').addEventListener('click', () => navigate('/solicitacoes'));

  // Mantém o foco na busca após a re-renderização causada pela navegação.
  if (query.texto) {
    const input = form.querySelector('#texto');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  try {
    const filtros = Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, query[campo]]));
    const solicitacoes = await api.listar(filtros);
    render(resultado, html`
      <p class="muted">${solicitacoes.length} ${solicitacoes.length === 1 ? 'resultado' : 'resultados'}</p>
      ${tabelaSolicitacoes(solicitacoes)}
    `);
    bindLinhas(resultado, navigate);
  } catch (err) {
    if (err.status === 400) {
      showFieldErrors(form, err.details);
      render(resultado, html`<div class="alert">${Object.values(err.details).join(' ')}</div>`);
    } else {
      render(resultado, html`<div class="alert">${err.message}</div>`);
    }
  }
}
