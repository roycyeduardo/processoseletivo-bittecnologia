const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const env = require('./config/env');
const createRoutes = require('./routes');
const { createContainer, defaultRepositories } = require('./container');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const OITO_HORAS = 8 * 60 * 60 * 1000;

function createApp(repositories = defaultRepositories()) {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(session({
    name: 'sid',
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true, // renova a expiração a cada requisição
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.isProduction,
      maxAge: OITO_HORAS,
    },
  }));

  // API REST
  app.use('/api', createRoutes(createContainer(repositories)));
  app.use('/api', notFound);

  // Frontend estático (SPA)
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
