const _ = require('lodash');
const debug = require('debug')('falcon:models:camera');
const Joi = require('koa-joi-router').Joi;
const mysql = require('@simplisafe/ss_mysql');
const moment = require('moment');
const SSError = require('@simplisafe/ss_error').SSError;
const { fromClient, toClient, createDefaults, clean } = require('./formatters/CameraSubscriptionFormatter');

class CameraSubscription {
  constructor(subscription) {
    this.__subscription = subscription;
  }

  toClient() {
    if (!this.__subscription) throw new SSError('ServerError', 500).setMessage('Camera Subscription was not loaded, cannot call toClient');

    return toClient(this.__subscription);
  }

  async save(ctx) {
    let sub = clean(_.cloneDeep(this.__subscription));

    if (!_.get(sub, 'uuid') || !_.get(sub, 'sid')) throw new SSError('ServerError', 500).setMessage('Cannot Update Camera Subscription, Sid and UUID must be present');

    await mysql.promiseQuery('UPDATE ss_camera_service SET ? WHERE sid = ? AND uuid = ?', [ sub, _.get(sub, 'sid'), _.get(sub, 'uuid') ]);

    sub.edit_uid = _.get(ctx, 'state.user') || 0;
    sub.edit_timestamp = moment().unix();

    await mysql.promiseQuery('INSERT INTO ss_camera_service_AUDIT SET ?', sub);
  }

  async cancel(ctx) {
    if (!this.__subscription) throw new SSError('ServerError', 500).setMessage('Camera Subscription was not loaded, cannot cancel subscription');
    _.set(this.__subscription, 'canceled', moment().unix());
    _.set(this.__subscription, 'expires', 0);

    return this.save(ctx);
  }

  async activate(ctx) {
    if (!this.__subscription) throw new SSError('ServerError', 500).setMessage('Camera Subscription was not loaded, cannot reactivate subscription');
    _.set(this.__subscription, 'canceled', 0);
    _.set(this.__subscription, 'expires', moment().add(1, 'month').unix());

    return this.save(ctx);
  }

  async update(ctx, updates) {
    if (!this.__subscription) throw new SSError('ServerError', 500).setMessage('Camera Subscription was not loaded, cannot update');
    let formatted = fromClient(updates);
    _.merge(this.__subscription, formatted);

    return this.save(ctx);
  }
}

/**
 * Creates a new Camera Subscription row for this UUID and Sid with updates
 * @param {string} uuid
 * @param {object} updates
 * @returns {CameraSubscription}
 */
async function create(uuid, updates) {
  let camSub = {
    uuid,
    sid: _.get(updates, 'sid'),
    uid: _.get(updates, 'uid'),
  };

  const existing = await mysql.promiseQueryOne('SELECT * FROM ss_camera_service WHERE uuid = ? AND sid = ?', [ uuid, _.get(updates, 'sid') ]);
  if (existing) throw new SSError('Conflict', 409).setMessage('Camera service for this uuid and sid already exists!');

  const formattedUpdates = fromClient(updates);
  const defaults = createDefaults();

  _.merge(camSub, formattedUpdates);
  _.defaults(camSub, defaults);

  const res = await mysql.promiseQuery('INSERT INTO ss_camera_service SET ?', camSub);
  debug(`CameraSubscription: Create Mysql Insert Results: ${JSON.stringify(res)}`);

  return bySidUuid(_.get(updates, 'sid'), uuid);
}

/**
 * Returns all Camera Service Rows by Sid
 * @param {number} sid
 * @returns {CameraSubscription[]}
 */
async function bySid(sid) {
  debug(`Getting camera subscriptions by sid: ${sid}`);

  const query = `SELECT * FROM ss_camera_service WHERE sid = ?`;
  const results = await mysql.promiseQueryMulti(query, sid);

  return _.map(results, sub => new CameraSubscription(sub));
}

/**
 * Returns all Camera Service Rows by Uid
 * @param {number} uid
 * @returns {CameraSubscription[]}
 */
async function byUid(uid) {
  debug(`Getting camera subscriptions by uid: ${uid}`);

  const query = `SELECT * FROM ss_camera_service WHERE uid = ?`;
  const results = await mysql.promiseQueryMulti(query, uid);

  return _.map(results, sub => new CameraSubscription(sub));
}

/**
 * Return Camera Service by Sid & UUID
 * @param {number} sid
 * @param {string} uuid
 * @returns {CameraSubscription}
 */
async function bySidUuid(sid, uuid) {
  debug(`Getting a camera subscription by sid: ${sid} and uuid: ${uuid}`);

  const query = `SELECT * FROM ss_camera_service WHERE sid = ? AND uuid = ?`;
  const result = await mysql.promiseQueryOne(query, [sid, uuid]);

  if  (!result) throw new SSError('NotFound', 404).setMessage('A Camera Subscription does not exist for this uuid & sid');

  return new CameraSubscription(result);
}

function validInput() {
  return {
    sid: Joi.number().required(),
    uid: Joi.number().required(),
    uuid: Joi.string(),
    recordingLifetime: Joi.number(),
    planSku: Joi.string(),
    price: Joi.number(),
    expires: Joi.number(),
    time: Joi.number(),
    extraTime: Joi.number(),
    trialUsed: Joi.boolean(),
  };
}

function validOutput() {
  return {
    uid: Joi.number(),
    sid: Joi.number(),
    uuid: Joi.string(),
    recordingLifetime: Joi.number(),
    planSku: Joi.string(),
    price: Joi.number(),
    created: Joi.number(),
    expires: Joi.number(),
    canceled: Joi.number(),
    time: Joi.number(),
    extraTime: Joi.number(),
    trialUsed: Joi.boolean(),
  };
}

module.exports = {
  validInput,
  validOutput,
  bySid,
  byUid,
  bySidUuid,
  create,
};
