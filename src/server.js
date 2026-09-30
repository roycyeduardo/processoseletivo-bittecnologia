const env = require('./config/env');
const createApp = require('./app');
const { getPool, closePool } = require('./config/database');

async function start() {
  try {
    await getPool();
    console.log(`Conectado ao SQL Server (${env.db.server}/${env.db.database}).`);
  } catch (err) {
    console.error('Não foi possível conectar ao banco de dados:', err.message);
    process.exit(1);
  }

  const server = createApp().listen(env.port, () => {
    console.log(`Portal de Solicitações em http://localhost:${env.port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
