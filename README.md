# Portal de Solicitações Internas

Mini-projeto full stack para registro e acompanhamento de demandas internas (TI, RH, Compras, Financeiro e Infraestrutura).
Colaboradores abrem solicitações e acompanham o andamento até a conclusão; atendentes mudam o status de cada uma.

- **Backend:** Node.js + Express (API REST em camadas)
- **Frontend:** HTML, CSS e JavaScript puros (SPA sem etapa de build), servidos pelo próprio Express
- **Banco de dados:** Microsoft SQL Server
- **Testes:** `node:test` + Supertest

> Documentação complementar:
> [Memorial Técnico de Desenvolvimento](docs/MEMORIAL_TECNICO.md) ·
> [Dicionário de Dados](docs/DICIONARIO_DE_DADOS.md)

---

## Funcionalidades

| Módulo | O que faz |
|---|---|
| Autenticação | Login com usuário e senha, sessão no servidor (cookie `httpOnly`) e logout. Todas as telas e rotas da API, exceto o login, exigem sessão. |
| Cadastro | Criar solicitação (título, descrição, categoria). Data de criação, solicitante e status **Aberto** são preenchidos automaticamente. Editar e excluir enquanto estiver **Aberta** e somente pelo próprio solicitante. |
| Gerenciamento | Listagem com código, título, categoria, solicitante, data de abertura e status. Tela de detalhes com histórico de mudanças de status. Alteração de status pelos perfis **Atendente** e **Administrador**. |
| Usuários | O **Administrador** lista os usuários e cadastra novos (nome, login, senha inicial e perfil). |
| Consulta | Filtros por período, categoria, status e texto livre no título. Os filtros ficam na URL e sobrevivem ao recarregamento. |
| Painel | Total de solicitações, abertas, em atendimento e concluídas. Cada indicador leva à lista já filtrada. |

### Regras de negócio

- Fluxo de status: `Aberto → Em Atendimento → Concluído`. Uma solicitação em atendimento pode voltar para `Aberto`; `Concluído` é final.
- Perfis:
  - **SOLICITANTE:** abre e acompanha solicitações.
  - **ATENDENTE:** também altera o status.
  - **ADMINISTRADOR:** também cadastra usuários.
- Cadastro de usuário: login único (minúsculas, números, `.`, `-`, `_`) e senha de 6 a 72 caracteres, gravada como hash bcrypt.
- Editar e excluir: somente o solicitante e somente com status **Aberto**.
- Toda mudança de status fica registrada na tabela `HistoricoStatus` (quem, quando, de → para).

---

## Pré-requisitos

| Item | Versão |
|---|---|
| Linguagem | JavaScript em **Node.js 22 ou superior** (testado no 25.2) |
| Gerenciador de pacotes | npm (incluso no Node.js) |
| Banco de dados | **Microsoft SQL Server 2014 ou superior** (testado no 2014), com autenticação SQL e TCP/IP habilitado na porta 1433 |

### Dependências

| Pacote | Uso |
|---|---|
| `express` | Servidor HTTP e roteamento da API |
| `mssql` | Driver do SQL Server (pool de conexões, consultas parametrizadas, transações) |
| `express-session` | Controle de sessão no servidor |
| `bcryptjs` | Hash e verificação de senhas |
| `helmet` | Cabeçalhos HTTP de segurança (CSP, etc.) |
| `dotenv` | Leitura das variáveis de ambiente do arquivo `.env` |
| `supertest` *(dev)* | Testes de integração das rotas |

O frontend não tem dependências: é servido como arquivos estáticos pela pasta `public/`.

---

## Instalação

### 1. Banco de dados

Garanta que o SQL Server está em execução e aceita login SQL (`sa` ou outro usuário com permissão para criar bancos).

**Opção A: script Node (recomendada)**, executada depois do passo 2:

```bash
npm run db:setup
```

**Opção B: scripts SQL manualmente** (SSMS, Azure Data Studio ou `sqlcmd`), nesta ordem:

```bash
sqlcmd -S localhost -U sa -P 14 -i database/01_schema.sql
```

```bash
sqlcmd -S localhost -U sa -P 14 -i database/02_seed.sql
```

As duas opções criam o banco `PortalSolicitacoes`, as tabelas e os dados de demonstração.
**Atenção:** os scripts recriam as tabelas e apagam os dados existentes.

**Atualizando um banco criado antes do perfil Administrador?** Rode só a migração. Ela preserva os dados e pode ser executada mais de uma vez:

```bash
sqlcmd -S localhost -U sa -P 14 -i database/03_migracao_perfil_administrador.sql
```

### 2. Backend e frontend

O frontend é servido pelo backend, então só existe uma instalação:

```bash
npm install
```

---

## Configuração

Copie o arquivo de exemplo e ajuste se necessário:

```bash
cp .env.example .env
```

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP da aplicação |
| `NODE_ENV` | `development` | Em `production`, o cookie de sessão passa a exigir HTTPS (`secure`) |
| `SESSION_SECRET` | — | Segredo para assinar o cookie de sessão. **Troque em produção.** |
| `DB_SERVER` | `localhost` | Host do SQL Server |
| `DB_PORT` | `1433` | Porta TCP do SQL Server |
| `DB_USER` | `sa` | Usuário do banco |
| `DB_PASSWORD` | `14` | Senha do banco |
| `DB_NAME` | `PortalSolicitacoes` | Nome do banco (os scripts SQL usam esse nome fixo) |
| `DB_ENCRYPT` | `false` | Criptografia TLS na conexão com o banco |
| `DB_TRUST_CERT` | `true` | Aceita certificado autoassinado do SQL Server |

### Credenciais de demonstração

Todos com a senha **`123456`**:

| Usuário | Nome | Perfil | Pode |
|---|---|---|---|
| `admin` | Administrador | ADMINISTRADOR | Tudo: atender solicitações e cadastrar usuários |
| `carlos` | Carlos Souza | ATENDENTE | Alterar o status das solicitações |
| `maria` | Maria Oliveira | SOLICITANTE | Abrir, editar e excluir as próprias solicitações abertas |
| `joao` | João Santos | SOLICITANTE | Idem |

---

## Execução

| Comando | O que faz |
|---|---|
| `npm start` | Sobe backend + frontend em `http://localhost:3000` |
| `npm run dev` | Mesmo que `start`, reiniciando ao salvar arquivos |
| `npm run db:setup` | Cria/recria o banco com dados de demonstração |
| `npm test` | Executa os testes automatizados (não precisa do banco) |

```bash
npm start
```

## Acesso

Abra **http://localhost:3000** e entre com um dos usuários de demonstração acima.
Para ver o fluxo completo, abra uma solicitação como `maria` e depois entre como `admin` para atendê-la.

---

## API

Todas as rotas usam o prefixo `/api`, recebem e devolvem JSON. Erros seguem o formato `{ "erro": "mensagem", "detalhes": { "campo": "mensagem" } }`.

| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| POST | `/auth/login` | Autentica `{ usuario, senha }` | 200, 400, 401 |
| POST | `/auth/logout` | Encerra a sessão | 204 |
| GET | `/auth/me` | Usuário da sessão atual | 200, 401 |
| GET | `/dashboard` | Indicadores `{ total, abertas, emAtendimento, concluidas }` | 200 |
| GET | `/categorias` | Lista de categorias | 200 |
| GET | `/status` | Lista de status | 200 |
| GET | `/solicitacoes` | Lista com filtros `?dataInicio&dataFim&categoriaId&statusId&texto` | 200, 400 |
| POST | `/solicitacoes` | Cria `{ titulo, descricao, categoriaId }` | 201, 400 |
| GET | `/solicitacoes/:id` | Detalhe + histórico + ações permitidas ao usuário | 200, 404 |
| PUT | `/solicitacoes/:id` | Edita (dono, status Aberto) | 200, 400, 403, 404, 409 |
| DELETE | `/solicitacoes/:id` | Exclui (dono, status Aberto) | 204, 403, 404, 409 |
| PATCH | `/solicitacoes/:id/status` | Altera status `{ statusId }` (atendente ou administrador) | 200, 400, 403, 404, 409 |
| GET | `/usuarios` | Lista usuários, sem o hash da senha (administrador) | 200, 403 |
| POST | `/usuarios` | Cadastra `{ nome, login, senha, perfil }` (administrador) | 201, 400, 403, 409 |

---

## Estrutura do projeto

```
├── database/
│   ├── 01_schema.sql          # criação do banco, tabelas, chaves e índices
│   ├── 02_seed.sql            # dados iniciais (status, categorias, usuários, exemplos)
│   ├── 03_migracao_perfil_administrador.sql  # atualiza bancos já existentes
│   └── setup.js               # executa os scripts acima (npm run db:setup)
├── docs/
│   ├── MEMORIAL_TECNICO.md
│   └── DICIONARIO_DE_DADOS.md
├── public/                    # frontend (SPA)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js             # inicialização, rotas e estado global
│       ├── api.js             # cliente HTTP da API
│       ├── router.js          # roteador por hash
│       ├── ui.js              # escape de HTML, formatação, toast
│       └── views/             # uma tela por arquivo
├── src/                       # backend
│   ├── server.js              # ponto de entrada
│   ├── app.js                 # configuração do Express
│   ├── container.js           # injeção de dependências
│   ├── constants.js           # status, transições e perfis
│   ├── config/                # variáveis de ambiente e pool do banco
│   ├── routes/                # definição dos endpoints
│   ├── controllers/           # HTTP: lê a requisição, devolve a resposta
│   ├── services/              # regras de negócio e validações
│   ├── repositories/          # acesso ao SQL Server
│   ├── middlewares/           # autenticação e tratamento de erros
│   └── utils/
└── tests/                     # testes com repositórios em memória
```

## Evidências

Prints da aplicação em `docs/evidencias/` (login, painel, lista com filtros, formulário, detalhe com histórico).
