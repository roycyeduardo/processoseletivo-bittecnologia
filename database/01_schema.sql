/* =============================================================
   Portal de Solicitações Internas — criação da estrutura
   Compatível com SQL Server 2014+
   ============================================================= */

IF DB_ID('PortalSolicitacoes') IS NULL
    CREATE DATABASE PortalSolicitacoes;
GO

USE PortalSolicitacoes;
GO

/* ---------- Remoção (ordem inversa das dependências) ---------- */
IF OBJECT_ID('dbo.HistoricoStatus', 'U') IS NOT NULL DROP TABLE dbo.HistoricoStatus;
IF OBJECT_ID('dbo.Solicitacoes',    'U') IS NOT NULL DROP TABLE dbo.Solicitacoes;
IF OBJECT_ID('dbo.StatusSolicitacao','U') IS NOT NULL DROP TABLE dbo.StatusSolicitacao;
IF OBJECT_ID('dbo.Categorias',      'U') IS NOT NULL DROP TABLE dbo.Categorias;
IF OBJECT_ID('dbo.Usuarios',        'U') IS NOT NULL DROP TABLE dbo.Usuarios;
GO

/* ---------- Usuários ---------- */
CREATE TABLE dbo.Usuarios (
    Id           INT IDENTITY(1,1) NOT NULL,
    Nome         NVARCHAR(100)     NOT NULL,
    Login        VARCHAR(50)       NOT NULL,
    SenhaHash    VARCHAR(100)      NOT NULL,
    Perfil       VARCHAR(20)       NOT NULL CONSTRAINT DF_Usuarios_Perfil DEFAULT ('SOLICITANTE'),
    Ativo        BIT               NOT NULL CONSTRAINT DF_Usuarios_Ativo  DEFAULT (1),
    DataCriacao  DATETIME2(0)      NOT NULL CONSTRAINT DF_Usuarios_Data   DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Usuarios        PRIMARY KEY (Id),
    CONSTRAINT UQ_Usuarios_Login  UNIQUE (Login),
    CONSTRAINT CK_Usuarios_Perfil CHECK (Perfil IN ('SOLICITANTE', 'ATENDENTE', 'ADMINISTRADOR'))
);
GO

/* ---------- Categorias ---------- */
CREATE TABLE dbo.Categorias (
    Id    INT IDENTITY(1,1) NOT NULL,
    Nome  NVARCHAR(50)      NOT NULL,
    CONSTRAINT PK_Categorias      PRIMARY KEY (Id),
    CONSTRAINT UQ_Categorias_Nome UNIQUE (Nome)
);
GO

/* ---------- Status (domínio fixo, Id definido manualmente) ---------- */
CREATE TABLE dbo.StatusSolicitacao (
    Id    TINYINT      NOT NULL,
    Nome  NVARCHAR(30) NOT NULL,
    CONSTRAINT PK_StatusSolicitacao      PRIMARY KEY (Id),
    CONSTRAINT UQ_StatusSolicitacao_Nome UNIQUE (Nome)
);
GO

/* ---------- Solicitações ---------- */
CREATE TABLE dbo.Solicitacoes (
    Id               INT IDENTITY(1,1) NOT NULL,
    Titulo           NVARCHAR(150)     NOT NULL,
    Descricao        NVARCHAR(2000)    NOT NULL,
    CategoriaId      INT               NOT NULL,
    StatusId         TINYINT           NOT NULL CONSTRAINT DF_Solicitacoes_Status DEFAULT (1),
    UsuarioId        INT               NOT NULL,
    DataCriacao      DATETIME2(0)      NOT NULL CONSTRAINT DF_Solicitacoes_Data   DEFAULT (SYSDATETIME()),
    DataAtualizacao  DATETIME2(0)      NULL,
    CONSTRAINT PK_Solicitacoes           PRIMARY KEY (Id),
    CONSTRAINT FK_Solicitacoes_Categoria FOREIGN KEY (CategoriaId) REFERENCES dbo.Categorias(Id),
    CONSTRAINT FK_Solicitacoes_Status    FOREIGN KEY (StatusId)    REFERENCES dbo.StatusSolicitacao(Id),
    CONSTRAINT FK_Solicitacoes_Usuario   FOREIGN KEY (UsuarioId)   REFERENCES dbo.Usuarios(Id)
);
GO

CREATE INDEX IX_Solicitacoes_DataCriacao ON dbo.Solicitacoes (DataCriacao);
CREATE INDEX IX_Solicitacoes_Status      ON dbo.Solicitacoes (StatusId);
CREATE INDEX IX_Solicitacoes_Categoria   ON dbo.Solicitacoes (CategoriaId);
GO

/* ---------- Histórico de mudanças de status (auditoria) ---------- */
CREATE TABLE dbo.HistoricoStatus (
    Id                INT IDENTITY(1,1) NOT NULL,
    SolicitacaoId     INT               NOT NULL,
    StatusAnteriorId  TINYINT           NULL,
    StatusNovoId      TINYINT           NOT NULL,
    UsuarioId         INT               NOT NULL,
    DataAlteracao     DATETIME2(0)      NOT NULL CONSTRAINT DF_HistoricoStatus_Data DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_HistoricoStatus             PRIMARY KEY (Id),
    CONSTRAINT FK_HistoricoStatus_Solicitacao FOREIGN KEY (SolicitacaoId)    REFERENCES dbo.Solicitacoes(Id) ON DELETE CASCADE,
    CONSTRAINT FK_HistoricoStatus_Anterior    FOREIGN KEY (StatusAnteriorId) REFERENCES dbo.StatusSolicitacao(Id),
    CONSTRAINT FK_HistoricoStatus_Novo        FOREIGN KEY (StatusNovoId)     REFERENCES dbo.StatusSolicitacao(Id),
    CONSTRAINT FK_HistoricoStatus_Usuario     FOREIGN KEY (UsuarioId)        REFERENCES dbo.Usuarios(Id)
);
GO

CREATE INDEX IX_HistoricoStatus_Solicitacao ON dbo.HistoricoStatus (SolicitacaoId);
GO
