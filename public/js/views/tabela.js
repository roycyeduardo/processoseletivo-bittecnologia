import { html, codigo, formatDate, statusBadge } from '../ui.js';

/** Tabela de solicitações reutilizada no painel e na listagem. */
export function tabelaSolicitacoes(solicitacoes) {
  if (solicitacoes.length === 0) {
    return html`<div class="empty">Nenhuma solicitação encontrada.</div>`;
  }

  return html`
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Título</th>
            <th>Categoria</th>
            <th>Solicitante</th>
            <th>Abertura</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${solicitacoes.map((s) => html`
            <tr data-id="${s.id}" tabindex="0">
              <td class="num-col">${codigo(s.id)}</td>
              <td class="title">${s.titulo}</td>
              <td>${s.categoria}</td>
              <td>${s.solicitante}</td>
              <td class="num-col">${formatDate(s.dataCriacao)}</td>
              <td>${statusBadge(s.statusId, s.status)}</td>
            </tr>`)}
        </tbody>
      </table>
    </div>`;
}

/** Abre o detalhe ao clicar na linha ou pressionar Enter sobre ela. */
export function bindLinhas(el, navigate) {
  el.querySelectorAll('tr[data-id]').forEach((tr) => {
    const abrir = () => navigate(`/solicitacoes/${tr.dataset.id}`);
    tr.addEventListener('click', abrir);
    tr.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') abrir();
    });
  });
}
