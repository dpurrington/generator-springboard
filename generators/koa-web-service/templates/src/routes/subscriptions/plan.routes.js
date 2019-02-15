const _ = require('lodash');
const KoaRouter = require('koa-joi-router');
const Joi = KoaRouter.Joi;

// Models
const Plan = require('../../models/Plan');

const debug = require('debug')('falcon:routes:plans');
const router = KoaRouter();

router.route({
  method: 'GET',
  path: '/plans',
  meta: {
    swagger: {
      summary: 'Get all service plans',
      description: 'Get all service plans by country',
      tags: ['subscriptions'],
    },
  },
  validate: {
    query: {
      country: Joi.string().alphanum().length(2).required(),
    },
    output: {
      200: {
        body: {
          plans: Joi.array().items(Plan.validOutput()),
          country: Joi.string(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const country = _.toUpper(_.get(ctx, 'query.country'));
    debug(`Querying all service plans for Country: ${country}`);

    const plans = await Plan.byCountry(country);

    const result = {
      plans: _.map(plans, plan => plan.toClient()),
      country,
    };

    ctx.status = 200;
    ctx.body = result;
  },
});


module.exports = router;
