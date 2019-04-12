const _ = require('lodash');
const debug = require('debug')('<%= serviceName -%>:app');
const { handleErrorsKoa } = require('@simplisafe/ss_error');
const middleware = require('@simplisafe/ss_service_utils').middleware;
const Koa = require('koa');
const KoaSwagger = require('koa2-swagger-ui');
const mount = require('koa-mount');
const pino = require('koa-pino-logger')({ level: 'error' });
const routes = require('./routes');

const app = new Koa();    // App Routes
const server = new Koa(); // Overall Application

app.silent = true;
app.use(pino);
server.use(pino);

app.use(KoaSwagger({
  swaggerOptions: {
    url: '/v1/swagger',
  },
  routePrefix: '/swagger-ui',
}));

app.use(middleware);

/**
 * Error Handling
 */
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (e) {
    ctx.log.error(_.toString(e));
    return handleErrorsKoa(e, ctx);
  }
});

// hook up the routes
routes.forEach((r) => {
  debug('adding route for ', r);
  app.use(r.middleware());
});

// Mount the v1 app
server.use(mount('/v1', app));

module.exports = server;
