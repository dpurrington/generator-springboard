const { SwaggerAPI } = require('koa-joi-router-docs');
const KoaRouter = require('koa-joi-router');
const generator = new SwaggerAPI();
const router = KoaRouter();

generator.addJoiRouter(require('./health'));
// add other routes here

const spec = generator.generateSpec({
  info: {
    title: '<%= serviceName -%>',
    description: '<%= serviceName -%>',
    version: '1.0',
  },
  basePath: '/v1',
}, {
  defaultResponses: {},
});


router.get('/swagger', async (ctx) => {
  ctx.type = 'application/json';
  ctx.body = JSON.stringify(spec);
});

module.exports = router;
