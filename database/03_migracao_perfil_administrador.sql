/* =============================================================
   Migração: perfil ADMINISTRADOR (gestão de usuários)
   Para bancos criados antes desta versão. Preserva os dados e
   pode ser executada mais de uma vez sem efeito colateral.
   Instalações novas (01_schema + 02_seed) já incluem esta alteração.
   ============================================================= */

USE PortalSolicitacoes;
GO

/* Amplia os perfis permitidos */
IF OBJECT_ID('dbo.CK_Usuarios_Perfil', 'C') IS NOT NULL
    ALTER TABLE dbo.Usuarios DROP CONSTRAINT CK_Usuarios_Perfil;
GO

ALTER TABLE dbo.Usuarios ADD CONSTRAINT CK_Usuarios_Perfil
    CHECK (Perfil IN ('SOLICITANTE', 'ATENDENTE', 'ADMINISTRADOR'));
GO

/* Promove o usuário de demonstração "admin" */
UPDATE dbo.Usuarios SET Perfil = 'ADMINISTRADOR' WHERE Login = 'admin';

/* Usuário atendente de demonstração (senha 123456) */
IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Login = 'carlos')
    INSERT INTO dbo.Usuarios (Nome, Login, SenhaHash, Perfil)
    VALUES (N'Carlos Souza', 'carlos', '$2b$10$dErYNeUdJ0Rf5hn.UGFwK.5TRxb/Udpos/2IOMvABdHw9SQQZ.MfC', 'ATENDENTE');
GO
