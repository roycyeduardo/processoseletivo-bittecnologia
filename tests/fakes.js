/**
 * Repositórios em memória que imitam os repositórios SQL Server,
 * permitindo testar regras de negócio e rotas sem banco de dados.
 */
const DEMO_HASH = '$2b$10$dErYNeUdJ0Rf5hn.UGFwK.5TRxb/Udpos/2IOMvABdHw9SQQZ.MfC'; // "123456"

const CATEGORIAS = [{ id: 1, nome: 'TI' }, { id: 2, nome: 'RH' }];
const STATUS = [{ id: 1, nome: 'Aberto' }, { id: 2, nome: 'Em Atendimento' }, { id: 3, nome: 'Concluído' }];

const USUARIOS = [
  { id: 1, nome: 'Admin', login: 'admin', senhaHash: DEMO_HASH, perfil: 'ADMINISTRADOR', ativo: true },
  { id: 2, nome: 'Maria', login: 'maria', senhaHash: DEMO_HASH, perfil: 'SOLICITANTE', ativo: true },
  { id: 3, nome: 'Inativo', login: 'inativo', senhaHash: DEMO_HASH, perfil: 'SOLICITANTE', ativo: false },
  { id: 4, nome: 'Carlos', login: 'carlos', senhaHash: DEMO_HASH, perfil: 'ATENDENTE', ativo: true },
];

function createFakeRepositories() {
  const solicitacoes = [];
  const historico = [];
  const usuariosDb = USUARIOS.map((u) => ({ ...u })); // cópia: cada teste começa do zero
  let nextId = 1;

  const enrich = (s) => s && ({
    ...s,
    categoria: CATEGORIAS.find((c) => c.id === s.categoriaId).nome,
    status: STATUS.find((st) => st.id === s.statusId).nome,
    solicitante: usuariosDb.find((u) => u.id === s.usuarioId).nome,
  });

  const solicitacaoRepository = {
    async list(filtros = {}) {
      return solicitacoes
        .filter((s) => !filtros.statusId || s.statusId === filtros.statusId)
        .filter((s) => !filtros.categoriaId || s.categoriaId === filtros.categoriaId)
        .filter((s) => !filtros.texto || s.titulo.toLowerCase().includes(filtros.texto.toLowerCase()))
        .map(enrich);
    },
    async findById(id) {
      return enrich(solicitacoes.find((s) => s.id === id)) || null;
    },
    async listHistorico(id) {
      return historico.filter((h) => h.solicitacaoId === id);
    },
    async create(dados) {
      const s = { id: nextId++, ...dados, dataCriacao: new Date(), dataAtualizacao: null };
      solicitacoes.push(s);
      historico.push({ solicitacaoId: s.id, statusAnterior: null, statusNovo: dados.statusId });
      return s.id;
    },
    async update(id, dados, statusEsperado) {
      const s = solicitacoes.find((x) => x.id === id && x.statusId === statusEsperado);
      if (!s) return false;
      Object.assign(s, dados, { dataAtualizacao: new Date() });
      return true;
    },
    async remove(id, statusEsperado) {
      const index = solicitacoes.findIndex((x) => x.id === id && x.statusId === statusEsperado);
      if (index < 0) return false;
      solicitacoes.splice(index, 1);
      return true;
    },
    async updateStatus(id, statusAtual, statusNovo) {
      const s = solicitacoes.find((x) => x.id === id && x.statusId === statusAtual);
      if (!s) return false;
      s.statusId = statusNovo;
      historico.push({ solicitacaoId: id, statusAnterior: statusAtual, statusNovo });
      return true;
    },
    async countByStatus() {
      return STATUS.map((st) => ({
        statusId: st.id,
        status: st.nome,
        quantidade: solicitacoes.filter((s) => s.statusId === st.id).length,
      }));
    },
  };

  const dominioRepository = {
    listCategorias: async () => CATEGORIAS,
    listStatus: async () => STATUS,
    categoriaExists: async (id) => CATEGORIAS.some((c) => c.id === id),
  };

  const usuarioRepository = {
    findByLogin: async (login) => usuariosDb.find((u) => u.login === login) || null,
    list: async () => usuariosDb.map(({ senhaHash, ...publico }) => publico),
    async create({ nome, login, senhaHash, perfil }) {
      const usuario = {
        id: usuariosDb.length + 1, nome, login, senhaHash, perfil, ativo: true, dataCriacao: new Date(),
      };
      usuariosDb.push(usuario);
      const { senhaHash: _, ...publico } = usuario;
      return publico;
    },
  };

  return { solicitacaoRepository, dominioRepository, usuarioRepository };
}

const usuarios = {
  admin: { id: 1, nome: 'Admin', perfil: 'ADMINISTRADOR' },
  atendente: { id: 4, nome: 'Carlos', perfil: 'ATENDENTE' },
  maria: { id: 2, nome: 'Maria', perfil: 'SOLICITANTE' },
  outro: { id: 3, nome: 'Outro', perfil: 'SOLICITANTE' },
};

module.exports = { createFakeRepositories, usuarios };
