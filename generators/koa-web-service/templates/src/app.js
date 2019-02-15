global.Promise = require('bluebird');

const conf = require('./conf');

const _ = require('lodash');
const mysql = require('@simplisafe/ss_mysql');
const { koaRequestLogger, koaAddLogger, logger } = require('@simplisafe/ss_logger');
const { handleErrorsKoa } = require('@simplisafe/ss_error');
const middleware = require('@simplisafe/ss_service_utils').middleware;
const Koa = require('koa');
const KoaSwagger = require('koa2-swagger-ui');
const mount = require('koa-mount');

const log = logger(conf);
const app = new Koa();    // App Routes
const server = new Koa(); // Overall Application

app.use(KoaSwagger({
  swaggerOptions: {
    url: '/v1/swagger',
  },
}));

app.use(middleware);
app.use(koaRequestLogger(conf));
app.use(koaAddLogger(conf));

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

app.use(require('./routes/swagger/swagger.routes').middleware());
app.use(require('./routes/utilities/health.routes').middleware());
app.use(require('./routes/subscriptions/subscription.routes').middleware());
app.use(require('./routes/subscriptions/location.routes').middleware());
app.use(require('./routes/subscriptions/plan.routes').middleware());
app.use(require('./routes/cameras/camera.routes').middleware());

// Mount Entire Application at V1
server.use(mount('/v1', app));

/* async function startup() {
  await mysql.init({ mysql: _.get(conf, 'mysql'), consul: _.get(conf, 'consul') }, log);
}

startup().then(() => server.listen(_.get(conf, 'server.port', 3113)));
*/

module.exports = server;
