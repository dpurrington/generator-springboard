const _ = require('lodash');
const mysql = require('@simplisafe/ss_mysql');
const debug = require('debug')('falcon:models:plans');
const SSError = require('@simplisafe/ss_error').SSError;
const Joi = require('koa-joi-router').Joi;
const { featuresFromData } = require('./formatters/DataFormatter');

class Plan {
  constructor(plan) {
    this.__plan = plan;
  }

  toClient() {
    if (!this.__plan) throw new SSError('ServerError').setMessage('Tried to call toClient when no plan was loaded');

    return format(this.__plan);
  }

  toInternal() {
    if (!this.__plan) throw new SSError('ServerError').setMessage('Tried to call toInternal when no plan was loaded');

    return this.__plan;
  }
}

/**
 * Returns a list of Plans by Country
 * @param {string} country
 * @returns {Plan[]}
 */
async function byCountry(country) {
  debug(`Looking up service plans by country: ${country}`);

  const query = `
    SELECT
      p.*,
      u.country_iso_code_2 as country,
      c.code as currency
    FROM ss_service_plan AS p
    INNER JOIN uc_countries AS u USING(country_id)
    INNER JOIN currencies AS c ON p.currency_id = c.id
    WHERE country_iso_code_2 = ?
  `;

  const results = await mysql.promiseQueryMulti(query, country);

  return _.map(results, plan => new Plan(plan));
}

/**
 * Returns a single Plan by Sku
 * @param {string} sku
 * @returns {Plan}
 */
async function bySku(sku) {
  const query = `
    SELECT
      p.*,
      u.country_iso_code_2 as country,
      c.code as currency
    FROM ss_service_plan AS p
    INNER JOIN uc_countries AS u USING(country_id)
    INNER JOIN currencies AS c ON p.currency_id = c.id
    WHERE p.plan_sku = ?
  `;

  const result = await mysql.promiseQueryOne(query, sku);

  if (!result) throw new SSError('NotFound', 404).setMessage(`Plan could not be found for sku: ${sku}`);

  return new Plan(result);
}

function format(plan) {
  let data = mysql.unserialize(_.get(plan, 'data'));

  return {
    planSku: _.get(plan, 'plan_sku'),
    time: _.get(plan, 'time'),
    renew: _.get(plan, 'renew'),
    price: _.get(plan, 'price'),
    name: _.get(plan, 'name'),
    description: _.get(plan, 'description'),
    features: featuresFromData(data),
    systemVersion: _.get(plan, 'system_version'),
    currency: _.get(plan, 'currency'),
    country: _.get(plan, 'country'),
  };
}

function validOutput() {
  return {
    planSku: Joi.string().required(),
    time: Joi.number(),
    renew: Joi.number(),
    name: Joi.string(),
    price: Joi.number(),
    description: Joi.string(),
    features: {
      monitoring: Joi.boolean(),
      alerts: Joi.boolean(),
      online: Joi.boolean(),
      hazard: Joi.boolean(),
      video: Joi.boolean(),
      cameras: Joi.number(),
    },
    systemVersion: Joi.number(),
    currency: Joi.string().length(3),
    country: Joi.string().length(2),
  };
}

module.exports = {
  byCountry,
  bySku,
  format,
  validOutput,
};
