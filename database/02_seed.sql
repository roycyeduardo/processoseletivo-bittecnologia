/* =============================================================
   Portal de Solicitações Internas — dados iniciais
   Senha de todos os usuários de demonstração: 123456 (hash bcrypt)
   ============================================================= */

USE PortalSolicitacoes;
GO

INSERT INTO dbo.StatusSolicitacao (Id, Nome) VALUES
    (1, N'Aberto'),
    (2, N'Em Atendimento'),
    (3, N'Concluído');

INSERT INTO dbo.Categorias (Nome) VALUES
    (N'TI'), (N'RH'), (N'Compras'), (N'Financeiro'), (N'Infraestrutura');

INSERT INTO dbo.Usuarios (Nome, Login, SenhaHash, Perfil) VALUES
    (N'Administrador',  'admin',  '$2b$10$dErYNeUdJ0Rf5hn.UGFwK.5TRxb/Udpos/2IOMvABdHw9SQQZ.MfC', 'ADMINISTRADOR'),
    (N'Maria Oliveira', 'maria',  '$2b$10$dErYNeUdJ0Rf5hn.UGFwK.5TRxb/Udpos/2IOMvABdHw9SQQZ.MfC', 'SOLICITANTE'),
    (N'João Santos',    'joao',   '$2b$10$dErYNeUdJ0Rf5hn.UGFwK.5TRxb/Udpos/2IOMvABdHw9SQQZ.MfC', 'SOLICITANTE'),
    (N'Carlos Souza',   'carlos', '$2b$10$dErYNeUdJ0Rf5hn.UGFwK.5TRxb/Udpos/2IOMvABdHw9SQQZ.MfC', 'ATENDENTE');
GO

/* Algumas solicitações de exemplo */
INSERT INTO dbo.Solicitacoes (Titulo, Descricao, CategoriaId, StatusId, UsuarioId, DataCriacao) VALUES
    (N'Notebook não liga',            N'O notebook do setor comercial não liga desde ontem.',       1, 1, 2, DATEADD(DAY, -6, SYSDATETIME())),
    (N'Solicitação de férias',        N'Gostaria de agendar férias para dezembro.',                 2, 2, 3, DATEADD(DAY, -4, SYSDATETIME())),
    (N'Compra de cadeiras',           N'Necessárias 4 cadeiras ergonômicas para a sala de reunião.', 3, 1, 2, DATEADD(DAY, -2, SYSDATETIME())),
    (N'Reembolso de despesas',        N'Reembolso de despesas de viagem a Recife.',                 4, 3, 3, DATEADD(DAY, -10, SYSDATETIME())),
    (N'Ar-condicionado com vazamento', N'O ar-condicionado da sala 3 está pingando.',               5, 1, 3, DATEADD(DAY, -1, SYSDATETIME()));

INSERT INTO dbo.HistoricoStatus (SolicitacaoId, StatusAnteriorId, StatusNovoId, UsuarioId, DataAlteracao)
SELECT Id, NULL, 1, UsuarioId, DataCriacao FROM dbo.Solicitacoes;

INSERT INTO dbo.HistoricoStatus (SolicitacaoId, StatusAnteriorId, StatusNovoId, UsuarioId) VALUES
    (2, 1, 2, 1),
    (4, 1, 2, 1),
    (4, 2, 3, 1);
GO
