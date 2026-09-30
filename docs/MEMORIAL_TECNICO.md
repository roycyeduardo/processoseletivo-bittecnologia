# Memorial Técnico de Desenvolvimento

**Projeto:** Portal de Solicitações Internas
**Processo seletivo:** Desenvolvedor(a) de Sistemas Júnior, bit Soluções (09/2026)

Este documento registra as tecnologias usadas, por que foram escolhidas, como a solução está organizada e quais são as limitações conhecidas.

---

## 1. Visão geral

A aplicação é um monólito Node.js com duas partes:

- uma **API REST** em Express, organizada em camadas (rotas → controllers → services → repositories), que concentra regras de negócio, validação e persistência no SQL Server;
- um **frontend SPA** em JavaScript puro, servido como arquivos estáticos pelo mesmo servidor, que consome a API via `fetch`.

```
Navegador (SPA)  ──fetch/JSON + cookie de sessão──▶  Express
                                                     ├─ middlewares (helmet, sessão, auth, erros)
                                                     ├─ routes → controllers → services → repositories
                                                     └─────────────────────────────────▶ SQL Server
```

A escolha por um único processo simplifica a instalação (`npm install` e `npm start`), elimina CORS (frontend e API compartilham a origem) e permite usar cookie de sessão `SameSite=Strict`.

---

## 2. Tecnologias utilizadas e justificativa técnica

### 2.1 Node.js (linguagem JavaScript), backend

- **Motivo:** mesma linguagem no backend e no frontend, o que reduz a troca de contexto num projeto pequeno. É um runtime maduro, com ecossistema amplo para SQL Server.
- **Benefícios:** I/O não bloqueante adequado a uma API que passa a maior parte do tempo esperando o banco. O `node:test` embutido dispensa framework de testes.
- **Frente às alternativas:** em relação a .NET ou Java/Spring, exige menos estrutura inicial e compila instantaneamente; para um sistema com meia dúzia de entidades, o ganho de produtividade supera o do tipamento forte. PHP também atenderia, mas exigiria outra linguagem no frontend.
- **Impacto:** a produtividade é alta. Para crescer, seria natural migrar para TypeScript (ver Análise Crítica).

### 2.2 Express 5, framework HTTP

- **Motivo:** é o framework web mais difundido do ecossistema Node, minimalista e bem documentado.
- **Benefícios:** middlewares simples de compor (autenticação, erros, arquivos estáticos). A versão 5 propaga automaticamente erros de handlers `async`.
- **Frente às alternativas:** NestJS impõe uma arquitetura mais pesada (decorators, módulos) e desproporcional ao escopo; Fastify é mais rápido, mas tem ecossistema menor e o desempenho não é gargalo aqui.
- **Impacto:** baixa curva de aprendizado para quem mantém. A organização em camadas foi feita manualmente, o que deixa claro onde cada responsabilidade fica.

### 2.3 Microsoft SQL Server, banco de dados

- **Motivo:** requisito do ambiente (banco já utilizado) e SGBD relacional robusto, comum em ambientes corporativos.
- **Benefícios:** integridade referencial (FKs, `CHECK`, `UNIQUE`), transações ACID para gravar solicitação e histórico juntos e índices para os filtros.
- **Frente às alternativas:** um banco NoSQL não traria vantagem num domínio naturalmente relacional (usuário → solicitação → categoria/status). SQLite facilitaria a instalação, mas não representaria um ambiente real.
- **Impacto:** os scripts foram escritos para o **SQL Server 2014** (sem `DROP IF EXISTS` nem `CREATE OR ALTER`), o que garante compatibilidade com versões antigas e novas.

### 2.4 mssql (tedious), driver do banco

- **Motivo:** driver oficial de fato do SQL Server para Node, 100% JavaScript (sem dependência nativa/ODBC).
- **Benefícios:** pool de conexões, **consultas parametrizadas** (proteção contra SQL Injection), transações e tipagem dos parâmetros (`sql.Int`, `sql.NVarChar`...).
- **Frente às alternativas:** um ORM (Sequelize, Prisma, TypeORM) abstrairia o SQL. Preferi SQL explícito para demonstrar modelagem e consultas, manter controle total sobre `JOIN`s e filtros e evitar a curva de aprendizado e as migrations de um ORM num projeto deste tamanho. O acesso a dados fica isolado nos *repositories*, então trocar por um ORM depois afetaria só essa camada.
- **Impacto:** consultas legíveis e fáceis de otimizar. O custo é escrever SQL à mão.

### 2.5 express-session, controle de sessão

- **Motivo:** o requisito pede “controle de sessão” e logout. Sessão no servidor atende isso diretamente.
- **Benefícios:** o logout invalida a sessão de fato (no servidor), o cookie é `httpOnly` (inacessível a JavaScript, o que mitiga roubo por XSS) e `SameSite=Strict` (mitiga CSRF). Há expiração por inatividade (8 h, renovada a cada requisição).
- **Frente às alternativas:** JWT em `localStorage` fica exposto a XSS, e um JWT não pode ser revogado antes de expirar sem uma *blacklist*, o que na prática recria o estado no servidor. JWT faz mais sentido com vários clientes (mobile) ou vários serviços, o que não é o caso.
- **Impacto:** simples e seguro para uma aplicação web de mesma origem. Limitação: o armazenamento padrão é em memória (ver Análise Crítica).

### 2.6 bcryptjs, hash de senhas

- **Motivo:** senhas nunca devem ser armazenadas em texto nem com hash rápido (MD5/SHA).
- **Benefícios:** bcrypt é lento de propósito e usa *salt* embutido, o que dificulta ataques de força bruta e de *rainbow table*.
- **Frente às alternativas:** `bcrypt` (nativo) é mais rápido, mas exige compilação nativa, o que pode falhar no Windows. `argon2` é mais moderno, com o mesmo problema. `bcryptjs` é JavaScript puro e roda em qualquer ambiente.
- **Impacto:** instalação sem atrito. O custo computacional (10 rounds) é irrelevante para o volume de logins.

### 2.7 helmet, cabeçalhos de segurança

- **Motivo:** aplica com uma linha um conjunto de cabeçalhos recomendados (Content-Security-Policy, X-Content-Type-Options, remoção de `X-Powered-By`, etc.).
- **Benefícios:** a CSP bloqueia scripts externos e inline, uma segunda barreira contra XSS.
- **Impacto:** nenhum custo de manutenção. O frontend foi escrito sem scripts nem estilos inline para funcionar com a CSP padrão.

### 2.8 dotenv, configuração

- **Motivo:** separar configuração (credenciais, porta) do código, seguindo o *12-factor app*.
- **Impacto:** o mesmo código roda em outro ambiente trocando só o `.env`. O `.env` fica fora do versionamento, e o `.env.example` documenta as variáveis.

### 2.9 HTML, CSS e JavaScript puros (ES Modules), frontend

- **Motivo:** o escopo (5 telas, formulários e listagens) não justifica um framework com etapa de build.
- **Benefícios:** zero dependências e zero build: o navegador carrega os módulos diretamente. Isso deixa explícito o domínio dos fundamentos (DOM, `fetch`, eventos, roteamento).
- **Frente às alternativas:** React, Vue ou Angular trariam componentização declarativa e reatividade, úteis em interfaces maiores, mas adicionariam toolchain (Vite/webpack), dependências e uma segunda aplicação para instalar e executar.
- **Impacto:** para o tamanho atual, a manutenção é simples: cada tela é um módulo em `public/js/views/`. Se o sistema crescer, a migração para um framework é o caminho natural, e a camada `api.js` seria reaproveitada sem mudanças.
- **Estilo:** minimalista, com paleta monocromática, tipografia do sistema e cor usada apenas para indicar status. Responsivo (grid adaptável, tabela com rolagem horizontal no celular) e com tema escuro automático (`prefers-color-scheme`).

### 2.10 node:test e Supertest, testes automatizados

- **Motivo:** o `node:test` já vem no Node (sem Jest/Mocha). O Supertest faz requisições HTTP à aplicação sem abrir porta.
- **Benefícios:** **38 testes** cobrindo regras de negócio (transições de status, permissões, validações) e a API (autenticação, sessão, códigos HTTP). Os testes usam **repositórios em memória** e rodam em cerca de 2 s, **sem banco de dados**.
- **Impacto:** as regras podem ser refatoradas com segurança. Os testes rodam em qualquer máquina e no CI.

### 2.11 GitHub Actions, integração contínua

- Workflow `.github/workflows/ci.yml` que instala as dependências e executa os testes a cada *push* e *pull request*.

### 2.12 Ferramentas de apoio

- **Git/GitHub:** versionamento e entrega.
- **npm:** gerenciamento de dependências e scripts (`start`, `dev`, `test`, `db:setup`).
- **sqlcmd / SSMS:** execução manual dos scripts SQL, como alternativa ao `npm run db:setup`.

---

## 3. Justificativa conceitual

### 3.1 Estrutura geral e organização das camadas

| Camada | Pasta | Responsabilidade | Não faz |
|---|---|---|---|
| Rotas | `src/routes` | Mapear método + URL → controller; aplicar `requireAuth` | Lógica |
| Controllers | `src/controllers` | Ler `req` (params, body, sessão), chamar o serviço, escolher o status HTTP | Regra de negócio, SQL |
| Services | `src/services` | **Regras de negócio e validação** (quem pode editar, transições de status, campos obrigatórios) | Conhecer HTTP ou SQL |
| Repositories | `src/repositories` | SQL parametrizado, transações, mapeamento de colunas para objetos | Decidir regras |
| Middlewares | `src/middlewares` | Autenticação e tratamento centralizado de erros | |

Com isso, uma regra como “só edita se estiver Aberta” vive em **um único lugar** (`solicitacaoService.garantirEditavel`), independentemente de quem chama.

### 3.2 Padrões de projeto utilizados

- **Repository:** isola o acesso a dados. É o que permite testar os serviços com repositórios falsos em memória (`tests/fakes.js`).
- **Injeção de dependências (manual) / Composition Root:** serviços e controllers são criados por *factories* que recebem suas dependências (`createSolicitacaoService({ solicitacaoRepository, ... })`). A montagem acontece em um único ponto, `src/container.js`. Sem framework de DI, mas com o mesmo benefício de testabilidade.
- **Middleware / Chain of Responsibility:** autenticação e erros como etapas da cadeia do Express.
- **Error handling centralizado:** a classe `AppError` carrega o status HTTP (`badRequest`, `forbidden`, `conflict`...). Os serviços apenas lançam o erro, e um único middleware formata a resposta `{ erro, detalhes }`. Erros inesperados viram 500 genérico, sem vazar *stack trace* ao cliente.
- **Máquina de estados:** as transições de status permitidas ficam declaradas em uma tabela (`TRANSICOES_STATUS` em `src/constants.js`), em vez de `if`s espalhados.
- **Singleton (pool de conexões):** um único pool reutilizado por toda a aplicação.

### 3.3 Estratégia de modelagem de dados

- **Normalização (3FN):** categoria e status são tabelas próprias, referenciadas por FK. Isso evita textos repetidos e inconsistentes (“TI”, “ti”, “T.I.”) e permite incluir categorias sem mudar código.
- **Status com Id fixo:** como o código depende dos valores (1, 2, 3), o `Id` não é `IDENTITY`. É definido no script e espelhado em `constants.js`.
- **Auditoria:** a tabela `HistoricoStatus` registra cada mudança (de → para, quem, quando). Não era requisito explícito, mas “acompanhar a evolução até a conclusão” fica muito mais útil com o histórico.
- **Integridade no banco, não só no código:** `UNIQUE` no login, `CHECK` no perfil, `DEFAULT` para status e datas, FKs em todas as relações, `ON DELETE CASCADE` apenas no histórico.
- **Índices** nas colunas usadas nos filtros (data, status, categoria).
- **Datas geradas pelo banco** (`SYSDATETIME()`), não pelo cliente, para impedir que o usuário forje a data de abertura.
- **Concorrência:** `UPDATE`/`DELETE` incluem `AND StatusId = @statusEsperado`. Se um atendente mudar o status entre a leitura e a gravação do solicitante, a operação não afeta nenhuma linha e o usuário recebe **409 Conflict**, em vez de editar uma solicitação que já está em atendimento.
- **Transações:** criação + histórico e mudança de status + histórico são gravados atomicamente.

### 3.4 Estratégia de autenticação e autorização

1. `POST /api/auth/login` valida os campos, busca o usuário e compara a senha com **bcrypt**.
2. Usuário inexistente, senha errada ou usuário inativo recebem **a mesma mensagem** (“Usuário ou senha inválidos.”), e o bcrypt é executado mesmo quando o usuário não existe, para que o tempo de resposta não revele logins válidos.
3. Com sucesso, o id de sessão é **regenerado** (proteção contra *session fixation*) e os dados públicos do usuário (sem hash) são guardados na sessão.
4. O cookie `sid` é `httpOnly`, `SameSite=Strict` e `secure` em produção.
5. O middleware `requireAuth` protege **todas** as rotas da API, exceto o login.
6. **Autorização por perfil e por dono:** `SOLICITANTE` edita e exclui apenas as próprias solicitações abertas; `ATENDENTE` também altera status; `ADMINISTRADOR` também cadastra usuários. Os perfis que podem atender ficam numa única lista (`PERFIS_ATENDIMENTO` em `constants.js`). O menu “Usuários” e a rota correspondente só aparecem para o administrador, mas quem bloqueia de fato é a API (403). O backend é a fonte da verdade. O frontend só esconde botões com base nos campos `podeEditar`, `podeExcluir` e `statusPermitidos` calculados pela API, sem duplicar a regra.
7. O frontend tem uma guarda de rota: sem sessão, qualquer tela redireciona ao login, e respostas 401 (sessão expirada) também levam ao login.

### 3.5 Comunicação entre frontend e backend

- **REST + JSON**, com verbos e códigos HTTP semânticos: `201 Created` com cabeçalho `Location`, `204 No Content`, `400` (validação, com erro por campo), `401`, `403`, `404`, `409` (regra de estado).
- Um cliente único (`public/js/api.js`) encapsula o `fetch`, converte erros em `ApiError` e trata a sessão expirada em um só lugar.
- Os erros de validação voltam no formato `{ detalhes: { campo: mensagem } }` e o frontend exibe cada mensagem ao lado do campo correspondente.
- **Filtros na URL** (`#/solicitacoes?statusId=1&texto=...`): voltar e recarregar preservam a consulta, e os cards do painel são links para a lista já filtrada.

### 3.6 Segurança básica (resumo)

| Ameaça | Mitigação |
|---|---|
| SQL Injection | 100% das consultas parametrizadas. Na busca textual, os curingas do `LIKE` (`%`, `_`, `[`) também são escapados |
| XSS | Template tag `html` que **escapa todo valor interpolado** por padrão, mais CSP via helmet e cookie `httpOnly` |
| CSRF | Cookie `SameSite=Strict`; a API aceita apenas JSON |
| Senhas | bcrypt com salt; hash nunca retornado pela API |
| Enumeração de usuários | Mensagem e tempo de resposta iguais para usuário inexistente, inativo ou com senha errada |
| Session fixation | `session.regenerate()` no login |
| Payload abusivo | Limite de 100 KB no corpo; limites de tamanho em todos os campos (validação + tipo da coluna) |
| Vazamento de detalhes internos | Erros 500 genéricos; detalhes apenas no log do servidor |
| Mass assignment | O serviço lê explicitamente só `titulo`, `descricao` e `categoriaId`; status e solicitante enviados pelo cliente são ignorados (há teste para isso) |

### 3.7 Organização do código-fonte

- Nomes do domínio em **português** (igual ao enunciado e ao banco), termos técnicos em inglês (`repository`, `controller`, `middleware`).
- `camelCase` em JavaScript, `PascalCase` no banco. Os repositórios fazem o mapeamento via *alias* no `SELECT` (`Titulo AS titulo`).
- Um arquivo por responsabilidade. Validações reutilizáveis em `utils/validators.js`; no frontend, utilitários em `ui.js` e a tabela reutilizada entre painel e lista (`views/tabela.js`).

---

## 4. Análise crítica

### 4.1 Limitações da solução atual

- **Sessões em memória:** o `MemoryStore` padrão do express-session perde as sessões ao reiniciar e não funciona com múltiplas instâncias. Em produção, usaria um *store* persistente (Redis ou uma tabela no próprio SQL Server).
- **Gestão de usuários parcial:** o administrador lista e cadastra usuários, mas ainda não edita, desativa (a coluna `Ativo` existe e o login já a respeita), redefine senha nem obriga a troca da senha inicial no primeiro acesso.
- **Listagem sem paginação:** retorna todos os registros filtrados. Para volumes grandes, seria necessário paginar no servidor (`OFFSET ... FETCH`, já disponível no SQL Server 2012+).
- **Sem proteção contra força bruta** no login (rate limiting ou bloqueio após N tentativas).
- **Visibilidade:** todos os usuários veem todas as solicitações (a listagem pede a coluna “Solicitante”, o que sugere visão geral). Em um cenário real, provavelmente o solicitante veria só as próprias e cada atendente só as da sua área.
- **Testes sem banco real:** os testes cobrem regras e rotas com repositórios falsos; as consultas SQL em si foram validadas manualmente. Faltam testes de integração com um SQL Server efêmero.
- **Fuso horário:** as datas são gravadas no horário local do servidor (`SYSDATETIME()`). Com usuários em fusos diferentes, o correto seria gravar em UTC (`SYSUTCDATETIME()`) e converter na exibição.

### 4.2 Melhorias futuras

- Docker + Docker Compose (aplicação + SQL Server) para subir o ambiente com um comando.
- Comentários/interações dentro da solicitação e anexos.
- Atribuição de responsável (atendente) e prazo (SLA).
- Notificações por e-mail na mudança de status.
- Paginação e ordenação configuráveis na lista; exportação para CSV/Excel.
- Painel com gráficos por categoria e tempo médio de atendimento, aproveitando a tabela de histórico.
- TypeScript no backend e validação por schema (Zod/Joi) compartilhável com o frontend.
- Documentação interativa da API (OpenAPI/Swagger).
- Migrations versionadas (ex.: Flyway, Knex, DbUp) em vez de scripts que recriam o banco.

### 4.3 Requisitos que poderiam ser aperfeiçoados

- **Quem altera o status?** O enunciado não define. Adotei o perfil `ATENDENTE`, mas o ideal seria confirmar com o negócio e, possivelmente, ter atendentes por categoria.
- **Transições de status:** não especificadas. Assumi um fluxo linear com possibilidade de devolver “Em Atendimento → Aberto” e “Concluído” como final. Talvez seja necessário reabrir concluídas ou ter um status “Cancelado”.
- **Exclusão:** física (o registro some). Para auditoria, uma exclusão lógica ou um status “Cancelado” costuma ser preferível.
- **Filtro de texto:** hoje busca só no título, como pedido. Buscar também na descrição seria natural para o usuário.

### 4.4 O que seria diferente em produção corporativa

- **Autenticação integrada** ao diretório da empresa (Active Directory/LDAP ou SSO via OpenID Connect/Azure AD) em vez de senhas próprias.
- **HTTPS obrigatório** e conexão criptografada com o banco (`DB_ENCRYPT=true` com certificado válido).
- **Usuário de banco com privilégio mínimo** (apenas `SELECT/INSERT/UPDATE/DELETE` nas tabelas da aplicação). A conta `sa` foi usada só por conveniência no ambiente de avaliação.
- **Segredos** em cofre (Azure Key Vault, HashiCorp Vault), não em arquivo `.env`.
- **Logs estruturados** (pino/winston) com correlação por requisição, além de monitoramento e alertas.
- **Pipeline CI/CD** completo: lint, testes, análise de dependências vulneráveis (`npm audit`/Dependabot), build de imagem e deploy automatizado com ambientes de homologação e produção.
- **Backup** e política de retenção do banco.
- **Frontend com framework** (React/Vue) e design system, caso o produto crescesse além de poucas telas.
