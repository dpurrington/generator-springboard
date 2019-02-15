const _ = require('lodash');
const moment = require('moment');
const mysql = require('@simplisafe/ss_mysql');
const debug = require('debug')('falcon:models:subscription');
const SSError = require('@simplisafe/ss_error').SSError;
const Joi = require('koa-joi-router').Joi;
const utils = require('../lib/utils');
const format = require('./formatters/SubscriptionFormatter');
const build = require('./build/SubscriptionBuilder');

const { DISPATCHER_FROM_COUNTRY_ID } = require('../conf/constants');

const { isDowngradeToCamera } = require('../lib/utils');

class Subscription {
  constructor(service) {
    this.__subscription = service;
  }

  async update(ctx, service) {
    if (!this.__subscription) throw new SSError('ServerError', 500).setMessage('Subscription was not loaded, cannot update subscription');

    let updates = format.fromClient(service);

    if (_.get(updates, 'country')) {
      let countryRow = await mysql.promiseQueryOne('SELECT country_id FROM uc_countries WHERE country_iso_code_2 = ?', _.get(updates, 'country'));
      if (_.get(countryRow, 'country_id')) _.set(updates, 'country_id', _.get(countryRow, 'country_id'));
    }

    if (_.get(updates, 'currency')) {
      let currencyRow = await mysql.promiseQueryOne('SELECT id FROM currencies WHERE code = ?', _.get(updates, 'currency'));
      if (_.get(currencyRow, 'id')) _.set(updates, 'currency_id', _.get(currencyRow, 'id'));
    }

    // Merge Data Together from existing and updates
    let data;
    try {
      data = mysql.unserialize(_.get(this.__subscription, 'data'));
    } catch (e) {
      throw new SSError('BadSubscriptionDataError', 500, e).setMessage('No Data available on subscription');
    }

    data = _.merge(data, _.get(updates, 'data', {}));

    // Add upgrade status if we sent it down
    let upgradeStatus = _.get(service, 'upgradeStatus');
    if (!_.isNil(upgradeStatus)) {
      _.set(this, '__subscription.upgradeStatus', upgradeStatus);
      data.upgrade_status = upgradeStatus;
    }

    _.set(updates, 'data', mysql.serialize(data));

    this.__subscription = _.merge(this.__subscription, updates);

    return this.save(ctx);
  }

  async save(ctx) {
    if (!this.__subscription) throw new SSError('ServerError', 500).setMessage('Subscription was not loaded, cannot save subscription');
    if (!this.__subscription.sid) throw new SSError('ServerError', 500).setMessage('Subscription must have a sid to be saved');

    let subscription = format.clean(this.__subscription);
    await mysql.promiseQuery('UPDATE ss_service SET ? WHERE sid = ?', [subscription, _.get(this.__subscription, 'sid')]);

    delete subscription.order_id;
    subscription.edit_uid = _.get(ctx, 'state.user') || 0;
    subscription.timestamp = moment().unix();

    await mysql.promiseQuery('INSERT INTO ss_service_AUDIT SET ?', subscription);
  }

  async applyPlan(ctx, planObj) {
    if (!this.__subscription) throw new SSError('ServerError', 500).setMessage('Subscription was not loaded, cannot apply plan to subscription');

    let plan = planObj.toInternal();

    if (isDowngradeToCamera(_.get(this.__subscription, 'plan_sku'), _.get(plan, 'plan_sku'))) {
      throw new SSError('InvalidParameter', 400).setMessage('Cannot downgrade a monitored plan to a camera plan');
    }

    this.__subscription = _.merge(this.__subscription, plan);

    return this.save(ctx);
  }

  toClient() {
    if (!this.__subscription) throw new SSError('ServerError', 500).setMessage('Subscription was not loaded, cannot return subscription');

    let data;
    try {
      data = mysql.unserialize(_.get(this.__subscription, 'data'));
    } catch (e) {
      throw new SSError('BadSubscriptionDataError', 500, e).setMessage('No Data available on subscription');
    }

    return format.toClient(this.__subscription, data);
  }
}

/**
 * Returns a single Subscription by Sid
 * @param {number} sid
 * @returns {Subscription}
 */
async function bySid(sid) {
  debug(`Getting Subscription by Sid: ${sid}`);
  const { paymentProfilesTable } = utils.getCimTables();

  const query = `
    SELECT *, currencies.code as currency, uc_countries.country_iso_code_2 as country
    FROM ss_service
      INNER JOIN currencies ON ss_service.currency_id = currencies.id
      INNER JOIN uc_countries USING(country_id)
      LEFT JOIN ${paymentProfilesTable} ON ss_service.cim_ppid = ${paymentProfilesTable}.customer_payment_profile_id
    WHERE sid = ?
  `;

  const result = await mysql.promiseQueryOne(query, sid);

  if (!result) throw new SSError('NotFound', 404).setMessage('Could not find Subscription');

  return new Subscription(result);
}

/**
 * Returns a single Subscription by Account
 * @param {string} account
 * @returns {Subscription}
 */
async function byAccount(account) {
  debug(`Getting Subscription by Account: ${account}`);
  const { paymentProfilesTable } = utils.getCimTables();

  const query = `
    SELECT *, currencies.code as currency, uc_countries.country_iso_code_2 as country
    FROM ss_service
      INNER JOIN ss_location USING(sid)
      INNER JOIN currencies ON ss_service.currency_id = currencies.id
      INNER JOIN uc_countries ON ss_service.country_id = uc_countries.country_id
      LEFT JOIN ${paymentProfilesTable} ON ss_service.cim_ppid = ${paymentProfilesTable}.customer_payment_profile_id
    WHERE account = ? ORDER BY s_status DESC LIMIT 1
  `;

  const result = await mysql.promiseQueryOne(query, account);

  if (!result) throw new SSError('NotFound', 404).setMessage('Could not find Subscription');

  return new Subscription(result);
}

/**
 * Returns multiple Subscriptions by Uid
 * @param {number} uid
 * @returns {Subscription[]}
 */
async function byUid(uid) {
  debug(`Getting all subscriptions by Uid: ${uid}`);
  const { paymentProfilesTable } = utils.getCimTables();

  const query = `
    SELECT *, currencies.code as currency, uc_countries.country_iso_code_2 as country
    FROM ss_service
      INNER JOIN currencies ON ss_service.currency_id = currencies.id
      INNER JOIN uc_countries ON ss_service.country_id = uc_countries.country_id
      LEFT JOIN ${paymentProfilesTable} ON ss_service.cim_ppid = ${paymentProfilesTable}.customer_payment_profile_id
    WHERE uid = ? ORDER BY s_status DESC
  `;

  const results = await mysql.promiseQueryMulti(query, uid);

  return _.map(results, sub => new Subscription(sub));
}

/**
 * Create a new Subscription from some default fields and a Plan
 * @param {object} fields
 * @param {Plan} planObj
 * @returns {Subscription}
 */
async function create(fields, planObj) {
  const base = planObj.toInternal();

  const subscription = build.newSubscription(_.merge(format.fromClient(fields), base));

  // Select proper dispatcher
  _.set(subscription, 'dispatch_name', DISPATCHER_FROM_COUNTRY_ID[_.get(subscription, 'country_id')]);

  const result = await mysql.promiseQuery('INSERT INTO ss_service SET ?', format.clean(subscription));

  return bySid(_.get(result, 'insertId'));
}

function validOutput() {
  return {
    uid: Joi.number(),
    sid: Joi.number(),
    orderId: Joi.number(),
    orderProductId: Joi.number(),
    sStatus: Joi.number(),
    planSku: Joi.string(),
    planName: Joi.string(),
    currency: Joi.string(),
    country: Joi.string().alphanum().length(2),
    data: Joi.string(),
    created: Joi.number(),
    activated: Joi.number(),
    expires: Joi.number(),
    canceled: Joi.number(),
    cancelReason: Joi.string().allow(null).allow(''),
    time: Joi.number(),
    extraTime: Joi.number(),
    price: Joi.number(),
    extraCharge: Joi.number(),
    renew: Joi.number(),
    lastSignal: Joi.number(),
    activationCode: Joi.string().allow(''),
    systemVersion: Joi.number(),
    dispatcher: Joi.string().allow(null).allow(''),
    creditCard: {
      ppid: Joi.number(),
      backupPpid: Joi.number().allow(null),
      uid: Joi.number(),
      type: Joi.string().allow(''),
      lastFour: Joi.string().allow(''),
    },
    features: {
      monitoring: Joi.boolean(),
      alerts: Joi.boolean(),
      online: Joi.boolean(),
      hazard: Joi.boolean(),
      video: Joi.boolean(),
      cameras: Joi.number(),
    },
    upgradeStatus: Joi.number(),
  };
}

function validCreateInput() {
  return {
    uid: Joi.number().default(-1),
    orderId: Joi.number().default(0),
    orderProductId: Joi.number().default(0),
    activationCode: Joi.string().default(''),
    creditCard: {
      ppid: Joi.number(),
      backupPpid: Joi.number().allow(null),
      uid: Joi.number(),
    },
  };
}

function validInput() {
  return {
    uid: Joi.number(),
    sid: Joi.number(),
    orderId: Joi.number(),
    orderProductId: Joi.number(),
    planSku: Joi.string(),
    planName: Joi.string(),
    currency: Joi.string(),
    country: Joi.string().alphanum().length(2),
    expires: Joi.number(),
    time: Joi.number(),
    extraTime: Joi.number(),
    price: Joi.number(),
    extraCharge: Joi.number(),
    renew: Joi.number(),
    activationCode: Joi.string(),
    systemVersion: Joi.number(),
    dispatcher: Joi.string(),
    creditCard: {
      ppid: Joi.number(),
      backupPpid: Joi.number().allow(null),
      uid: Joi.number(),
    },
    features: {
      monitoring: Joi.boolean(),
      alerts: Joi.boolean(),
      online: Joi.boolean(),
      hazard: Joi.boolean(),
      video: Joi.boolean(),
      cameras: Joi.number(),
    },
    upgradeStatus: Joi.number(),
  };
}

module.exports = {
  byAccount,
  bySid,
  byUid,
  create,
  validOutput,
  validCreateInput,
  validInput,
};
