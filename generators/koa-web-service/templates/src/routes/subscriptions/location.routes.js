const _ = require('lodash');
const KoaRouter = require('koa-joi-router');
const Joi = KoaRouter.Joi;

// Models
const Location = require('../../models/Location');

const debug = require('debug')('falcon:routes:location');
const router = KoaRouter();

router.route({
  method: 'PUT',
  path: '/locations/:sid',
  meta: {
    swagger: {
      summary: 'Update Location',
      description: 'Update a Location by sid',
      tags: ['subscriptions'],
    },
  },
  validate: {
    type: 'json',
    params: {
      sid: Joi.number(),
    },
    body: Location.validInput(),
    output: {
      200: {
        body: {
          location: Location.validOutput(),
        },
      },
    },
  },
  handler: async (ctx) => {
    const sid = _.get(ctx, 'params.sid');
    const locationUpdates = _.get(ctx, 'request.body');
    debug(`Updating location: ${sid} with updates: ${JSON.stringify(locationUpdates)}`);

    const location = await Location.bySid(sid);

    await location.update(ctx, locationUpdates);

    ctx.status = 200;
    ctx.body = {
      location: location.toClient(),
    };
  },
});

module.exports = router;
