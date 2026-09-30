/** Utilitários de interface compartilhados pelas views. */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Marca um trecho de HTML como seguro (não será escapado por `html`). */
class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

/**
 * Template tag que escapa automaticamente todos os valores interpolados,
 * evitando XSS. Arrays são concatenados; valores `SafeHtml` passam direto.
 */
export function html(strings, ...values) {
  const render = (v) => {
    if (v instanceof SafeHtml) return v.value;
    if (Array.isArray(v)) return v.map(render).join('');
    if (v === false || v === null || v === undefined) return '';
    return escape(v);
  };
  return new SafeHtml(strings.reduce((out, str, i) => out + str + (i < values.length ? render(values[i]) : ''), ''));
}

export function render(container, content) {
  container.innerHTML = String(content);
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const formatDate = (value) => (value ? dateFmt.format(new Date(value)) : '—');
export const formatDateTime = (value) => (value ? dateTimeFmt.format(new Date(value)) : '—');
export const codigo = (id) => `#${String(id).padStart(4, '0')}`;

export function statusBadge(statusId, nome) {
  return html`<span class="status s${statusId}">${nome}</span>`;
}

let toastTimer;
export function toast(message, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast show ${type === 'error' ? 'error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

/** Exibe as mensagens de validação retornadas pela API ao lado de cada campo. */
export function showFieldErrors(form, details = {}) {
  form.querySelectorAll('.field').forEach((field) => {
    const input = field.querySelector('[name]');
    const message = input ? details[input.name] : undefined;
    field.classList.toggle('invalid', Boolean(message));
    const error = field.querySelector('.error');
    if (error) error.textContent = message || '';
  });
}

export function loading(container) {
  render(container, html`<p class="muted">Carregando…</p>`);
}

export function errorState(container, err) {
  render(container, html`<div class="alert">${err.message}</div><a href="#/" class="back">← Voltar ao painel</a>`);
}
