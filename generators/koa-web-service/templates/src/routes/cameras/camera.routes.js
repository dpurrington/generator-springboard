const _ = require('lodash');
const KoaRouter = require('koa-joi-router');
const SSError = require('@simplisafe/ss_error').SSError;
const Joi = KoaRouter.Joi;
const router = KoaRouter();

// Models
const CameraSubscription = require('../../models/CameraSubscription');


router.route({
  method: 'GET',
  path: '/cameras/:uuid',
  meta: {
    swagger: {
      summary: 'Get Camera',
      description: 'Get Camera Service by UUID and Sid',
      tags: ['cameras'],
    },
  },
  validate: {
    param: {
      uuid: Joi.string(),
    },
    query: {
      sid: Joi.number().required(),
    },
    output: {
      200: {
        body: {
          subscription: CameraSubscription.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const uuid = _.get(ctx, 'params.uuid');
    const sid = parseInt(_.get(ctx, 'query.sid'));

    const subscription = await CameraSubscription.bySidUuid(sid, uuid);

    ctx.status = 200;
    ctx.body = {
      subscription: subscription.toClient(),
    };
  },
});

router.route({
  method: 'GET',
  path: '/cameras',
  meta: {
    swagger: {
      summary: 'Get All Cameras',
      description: 'Get All Cameras for an account using Sid or Uid',
      tags: ['cameras'],
    },
  },
  validate: {
    query: {
      sid: Joi.number(),
      uid: Joi.number(),
    },
    output: {
      200: {
        body: {
          sid: Joi.number(),
          uid: Joi.number(),
          subscriptions: Joi.array().items(CameraSubscription.validOutput()),
        },
      },
    },
  },
  handler: async (ctx) => {
    const sid = parseInt(_.get(ctx, 'query.sid'));
    const uid = parseInt(_.get(ctx, 'query.uid'));
    if (!sid && !uid) throw new SSError('InvalidParameter', 400).setMessage('Uid or Sid must be given');

    let cameraSubs = [];

    if (sid) {
      cameraSubs = await CameraSubscription.bySid(sid);
    } else {
      cameraSubs = await CameraSubscription.byUid(uid);
    }

    ctx.status = 200;
    ctx.body = {
      sid: sid || undefined,
      uid: uid || undefined,
      subscriptions: _.map(cameraSubs, sub => sub.toClient()),
    };
  },
});

router.route({
  method: 'POST',
  path: '/cameras/:uuid',
  meta: {
    swagger: {
      summary: 'Create Camera Service',
      description: 'Create new Camera Service row for account with given uuid and sid',
      tags: ['cameras'],
    },
  },
  validate: {
    type: 'json',
    params: {
      uuid: Joi.string(),
    },
    body: CameraSubscription.validInput(),
    output: {
      200: {
        body: {
          subscription: CameraSubscription.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const cameraSub = _.get(ctx, 'request.body');
    const uuid = _.get(ctx, 'params.uuid');

    const sub = await CameraSubscription.create(uuid, cameraSub);

    ctx.status = 200;
    ctx.body = {
      subscription: sub.toClient(),
    };
  },
});

router.route({
  method: 'PUT',
  path: '/cameras/:uuid',
  meta: {
    swagger: {
      summary: 'Update Camera Service',
      description: 'Update Camera Service row for account with the given sid',
      tags: ['cameras'],
    },
  },
  validate: {
    type: 'json',
    params: {
      uuid: Joi.string(),
    },
    body: CameraSubscription.validInput(),
    output: {
      200: {
        body: {
          subscription: CameraSubscription.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const updates = _.get(ctx, 'request.body');
    const uuid = _.get(ctx, 'params.uuid');

    const sub = await CameraSubscription.bySidUuid(_.get(updates, 'sid'), uuid);
    await sub.update(ctx, updates);

    ctx.status = 200;
    ctx.body = {
      subscription: sub.toClient(),
    };
  },
});

router.route({
  method: 'POST',
  path: '/cameras/:uuid/:sid/cancel',
  meta: {
    swagger: {
      summary: 'Cancel Camera Subscription',
      description: 'Cancel a Camera Subscription by Sid and UUID',
      tags: ['cameras'],
    },
  },
  validate: {
    params: {
      uuid: Joi.string(),
      sid: Joi.number(),
    },
    output: {
      200: {
        body: {
          subscription: CameraSubscription.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const sid = _.get(ctx, 'params.sid');
    const uuid = _.get(ctx, 'params.uuid');

    const subscription = await CameraSubscription.bySidUuid(sid, uuid);
    await subscription.cancel(ctx);

    ctx.status = 200;
    ctx.body = {
      subscription: subscription.toClient(),
    };
  },
});

router.route({
  method: 'POST',
  path: '/cameras/:uuid/:sid/activate',
  meta: {
    swagger: {
      summary: 'Activate Camera Subscription',
      description: 'Activate a Camera Subscription by Sid and UUID',
      tags: ['cameras'],
    },
  },
  validate: {
    params: {
      uuid: Joi.string(),
      sid: Joi.number(),
    },
    output: {
      200: {
        body: {
          subscription: CameraSubscription.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const sid = _.get(ctx, 'params.sid');
    const uuid = _.get(ctx, 'params.uuid');

    const subscription = await CameraSubscription.bySidUuid(sid, uuid);
    await subscription.activate(ctx);

    ctx.status = 200;
    ctx.body = {
      subscription: subscription.toClient(),
    };
  },
});

module.exports = router;
