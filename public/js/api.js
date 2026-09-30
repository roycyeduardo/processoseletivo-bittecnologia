/**
 * Cliente HTTP da API. Centraliza o tratamento de erros e o redirecionamento
 * para o login quando a sessão expira.
 */
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.erro || 'Falha na comunicação com o servidor.');
    this.status = status;
    this.details = body?.detalhes || {};
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(method, url, body) {
  const options = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`/api${url}`, options);
  } catch {
    throw new ApiError(0, { erro: 'Servidor indisponível. Verifique sua conexão.' });
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && url !== '/auth/login') onUnauthorized();
    throw new ApiError(response.status, data);
  }
  return data;
}

function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const api = {
  login: (usuario, senha) => request('POST', '/auth/login', { usuario, senha }),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),

  categorias: () => request('GET', '/categorias'),
  status: () => request('GET', '/status'),
  dashboard: () => request('GET', '/dashboard'),

  listar: (filtros) => request('GET', `/solicitacoes${toQuery(filtros)}`),
  obter: (id) => request('GET', `/solicitacoes/${id}`),
  criar: (dados) => request('POST', '/solicitacoes', dados),
  atualizar: (id, dados) => request('PUT', `/solicitacoes/${id}`, dados),
  excluir: (id) => request('DELETE', `/solicitacoes/${id}`),
  alterarStatus: (id, statusId) => request('PATCH', `/solicitacoes/${id}/status`, { statusId }),

  usuarios: () => request('GET', '/usuarios'),
  criarUsuario: (dados) => request('POST', '/usuarios', dados),
};
