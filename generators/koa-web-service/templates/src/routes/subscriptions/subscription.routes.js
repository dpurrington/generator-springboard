const _ = require('lodash');
const KoaRouter = require('koa-joi-router');
const Joi = KoaRouter.Joi;
const { SSError } = require('@simplisafe/ss_error');

// Models
const Subscription = require('../../models/Subscription');
const Location = require('../../models/Location');
const Plan = require('../../models/Plan');

const debug = require('debug')('falcon:routes:subscription');
const router = KoaRouter();

router.route({
  method: 'GET',
  path: '/subscriptions/:sid',
  meta: {
    swagger: {
      summary: 'Get subscription by sid',
      description: 'Get subscription by sid',
      tags: ['subscriptions'],
    },
  },
  validate: {
    params: {
      sid: Joi.number(),
    },
    output: {
      200: {
        body: {
          subscription: Subscription.validOutput(),
          location: Location.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    let sid = _.get(ctx, 'params.sid');

    let subscription = await Subscription.bySid(sid);
    let location = await Location.bySid(sid);

    let result = {
      subscription: subscription.toClient(),
      location: location.toClient(),
    };

    ctx.status = 200;
    ctx.body = result;
  },
});

router.route({
  method: 'PUT',
  path: '/subscriptions/:sid',
  meta: {
    swagger: {
      summary: 'Update Subscription',
      description: 'Update a Subscription by sid',
      tags: ['subscriptions'],
    },
  },
  validate: {
    type: 'json',
    params: {
      sid: Joi.number(),
    },
    body: Subscription.validInput(),
    output: {
      200: {
        body: {
          subscription: Subscription.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const sid = _.get(ctx, 'params.sid');
    const subscriptionUpdates = _.get(ctx, 'request.body');
    debug(`Updating Subscription: ${sid} with updates: ${JSON.stringify(subscriptionUpdates)}`);

    const subscription = await Subscription.bySid(sid);

    await subscription.update(ctx, subscriptionUpdates);

    ctx.status = 200;
    ctx.body = {
      subscription: subscription.toClient(),
    };
  },
});

router.route({
  method: 'GET',
  path: '/subscriptions/user/:uid',
  meta: {
    swagger: {
      summary: 'Get Subscriptions by uid',
      description: 'Get Subscriptions and Locations for a user by uid',
      tags: ['subscriptions'],
    },
  },
  validate: {
    params: {
      uid: Joi.number(),
    },
    output: {
      200: {
        body: {
          uid: Joi.number(),
          subscriptions: Joi.array().items({
            subscription: Subscription.validOutput(),
            location: Location.validOutput(),
          }),
        },
      },
    },
  },
  handler: async (ctx) => {
    const uid = _.get(ctx, 'params.uid');
    debug(`Getting all subscriptions and locations for user: ${uid}`);

    const subscriptions = await Subscription.byUid(uid);
    const locations = await Location.byUid(uid);

    ctx.status = 200;
    ctx.body = {
      uid,
      subscriptions: _.orderBy(_.map(subscriptions, (sub) => {
        const sid = _.get(sub, '__subscription.sid');
        const matchingLoc = _.find(locations, loc => _.get(loc, '__location.sid') === sid);

        return {
          subscription: sub.toClient(),
          location: matchingLoc ? matchingLoc.toClient() : undefined,
        };
      }), ['subscription.sStatus'], ['desc']),
    };
  },
});

router.route({
  method: 'POST',
  path: '/subscriptions/plan/:sku',
  meta: {
    swagger: {
      summary: 'Create Subscription',
      description: 'Create Subscription with the specified plan',
      tags: ['subscriptions'],
    },
  },
  validate: {
    type: 'json',
    body: Subscription.validCreateInput(),
    output: {
      200: {
        body: {
          subscription: Subscription.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const initialFields = _.get(ctx, 'request.body');
    const sku = _.get(ctx, 'params.sku');

    const plan = await Plan.bySku(sku);
    const subscription = await Subscription.create(initialFields, plan);

    ctx.status = 200;
    ctx.body = {
      subscription: subscription.toClient(),
    };
  },
});

router.route({
  method: 'POST',
  path: '/subscriptions/:sid/apply/:sku',
  meta: {
    swagger: {
      summary: 'Apply a plan to a Subscription',
      description: 'Apply a Plan via Sku to the specified Subscription',
      tags: ['subscriptions'],
    },
  },
  validate: {
    params: {
      sid: Joi.number(),
      sku: Joi.string().regex(/[A-Z0-9_]+/i),
    },
    output: {
      200: {
        body: {
          subscription: Subscription.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const sid = _.get(ctx, 'params.sid');
    const sku = _.get(ctx, 'params.sku');

    const plan = await Plan.bySku(sku);
    const subscription = await Subscription.bySid(sid);

    if (_.get(plan.toClient(), 'country') !== _.get(subscription.toClient(), 'country')) {
      throw new SSError('InvalidParameter', 400)
        .setMessage(`Cannot apply a plan with a different country: <${_.get(plan, 'country')}> to this subscription with country: <${_.get(subscription, 'country')}>`);
    }

    await subscription.applyPlan(ctx, plan);

    ctx.status = 200;
    ctx.body = {
      subscription: subscription.toClient(),
    };
  },
});

module.exports = router;
