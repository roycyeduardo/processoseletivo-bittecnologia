import { api } from '../api.js';
import { html, render, loading, errorState, showFieldErrors, toast, codigo } from '../ui.js';

/** Formulário de criação (#/solicitacoes/nova) e edição (#/solicitacoes/:id/editar). */
export async function formView({ el, params, carregarDominios, navigate }) {
  const editando = Boolean(params.id);
  loading(el);

  let dominios;
  let solicitacao = { titulo: '', descricao: '', categoriaId: '' };
  try {
    dominios = await carregarDominios();
    if (editando) {
      solicitacao = await api.obter(params.id);
      if (!solicitacao.podeEditar) {
        toast('Esta solicitação não pode mais ser editada.', 'error');
        navigate(`/solicitacoes/${params.id}`);
        return;
      }
    }
  } catch (err) {
    errorState(el, err);
    return;
  }

  const voltar = editando ? `#/solicitacoes/${params.id}` : '#/solicitacoes';

  render(el, html`
    <a class="back" href="${voltar}">← Voltar</a>
    <div class="page-head">
      <h1>${editando ? `Editar ${codigo(solicitacao.id)}` : 'Nova solicitação'}</h1>
    </div>

    <form class="form" id="form-solicitacao" novalidate>
      <div id="form-alert"></div>
      <div class="field">
        <label for="titulo">Título</label>
        <input id="titulo" name="titulo" maxlength="150" required value="${solicitacao.titulo}">
        <div class="error"></div>
      </div>
      <div class="field">
        <label for="categoriaId">Categoria</label>
        <select id="categoriaId" name="categoriaId" required>
          <option value="">Selecione…</option>
          ${dominios.categorias.map((c) => html`
            <option value="${c.id}" ${c.id === solicitacao.categoriaId ? html`selected` : ''}>${c.nome}</option>`)}
        </select>
        <div class="error"></div>
      </div>
      <div class="field">
        <label for="descricao">Descrição</label>
        <textarea id="descricao" name="descricao" maxlength="2000" required>${solicitacao.descricao}</textarea>
        <div class="error"></div>
      </div>
      <div class="actions">
        <button class="btn" type="submit">${editando ? 'Salvar alterações' : 'Registrar solicitação'}</button>
        <a class="btn ghost" href="${voltar}">Cancelar</a>
      </div>
    </form>
  `);

  const form = el.querySelector('#form-solicitacao');
  const alert = el.querySelector('#form-alert');
  form.querySelector('#titulo').focus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type=submit]');
    const dados = Object.fromEntries(new FormData(form));
    const payload = {
      titulo: dados.titulo.trim(),
      descricao: dados.descricao.trim(),
      categoriaId: dados.categoriaId ? Number(dados.categoriaId) : null,
    };

    alert.innerHTML = '';
    showFieldErrors(form, {});
    button.disabled = true;

    try {
      const salva = editando
        ? await api.atualizar(params.id, payload)
        : await api.criar(payload);
      toast(editando ? 'Solicitação atualizada.' : `Solicitação ${codigo(salva.id)} registrada.`);
      navigate(`/solicitacoes/${salva.id}`);
    } catch (err) {
      if (err.status === 400) showFieldErrors(form, err.details);
      else render(alert, html`<div class="alert">${err.message}</div>`);
      button.disabled = false;
    }
  });
}
