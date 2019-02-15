const KoaRouter = require('koa-joi-router');
const Joi = KoaRouter.Joi;

const mysql = require('@simplisafe/ss_mysql');

const router = KoaRouter();

router.route({
  method: 'GET',
  path: '/healthCheck',
  meta: {
    swagger: {
      summary: 'Health Check',
      description: 'Check whether or not the services are healthy',
      tags: ['utilities'],
    },
  },
  validate: {
    output: {
      200: {
        body: {
          mysql: Joi.string(),
        },
      },
    },
  },
  handler: async (ctx) => {
    ctx.body = {
      mysql: await mysql.check(),
    };
  },
});

module.exports = router;
