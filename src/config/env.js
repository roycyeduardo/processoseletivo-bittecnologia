require('dotenv').config({ quiet: true });

const env = {
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
  db: {
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT) || 1433,
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'PortalSolicitacoes',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
      // As datas são gravadas com SYSDATETIME() (horário local do servidor).
      useUTC: false,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
};

module.exports = env;
