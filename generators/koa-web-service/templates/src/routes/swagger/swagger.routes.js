const { SwaggerAPI } = require('koa-joi-router-docs');
const KoaRouter = require('koa-joi-router');
const generator = new SwaggerAPI();
const router = KoaRouter();

generator.addJoiRouter(require('../utilities/health.routes'));
generator.addJoiRouter(require('../subscriptions/location.routes'));
generator.addJoiRouter(require('../subscriptions/subscription.routes'));
generator.addJoiRouter(require('../subscriptions/plan.routes'));
generator.addJoiRouter(require('../cameras/camera.routes'));

const spec = generator.generateSpec({
  info: {
    title: 'Millenium Falcon Services API',
    description: 'Backend Service for Managing Services & Locations',
    version: '1.0',
  },
  basePath: '/v1',
  tags: [{
    name: 'utilities',
    description: 'Utility Endpoints',
  }, {
    name: 'subscriptions',
    description: 'Subscription Endpoints',
  }, {
    name: 'cameras',
    description: 'Camera Subscription Endpoints',
  }],
}, {
  defaultResponses: {},
});


router.get('/swagger', async (ctx) => {
  ctx.body = JSON.stringify(spec);
});

module.exports = router;
