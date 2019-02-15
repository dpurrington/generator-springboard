const _ = require('lodash');
const mysql = require('@simplisafe/ss_mysql');
const { SSError } = require('@simplisafe/ss_error');
const debug = require('debug')('falcon:models:location');
const moment = require('moment-timezone');
const Joi = require('koa-joi-router').Joi;
const format = require('./formatters/LocationFormatter');
const C = require('../conf/constants');

class Location {
  constructor(location) {
    this.__location = location;
  }

  isCameraAccount() {
    if (!this.__location) throw new SSError('ServerError', 500).setMessage('Location was not loaded, cannot access location');
    let account = _.get(this, '__location.account');
    return !account || _.startsWith(account, 'X');
  }

  async update(ctx, updates) {
    const rawUpdates = format.fromClient(updates);

    // Update Cache first and then build Object from that
    this.__location = _.merge(this.__location, rawUpdates);

    debug(`Updating Location and Auditing`);
    const country_id = _.get(await mysql.promiseQueryOne('SELECT country_id FROM uc_countries WHERE country_iso_code_2 = ?', _.get(this.__location, 'country')), 'country_id', 840);

    const updateLocation = format.clean(_.merge(_.cloneDeep(this.__location), {
      modified: moment().unix(),
      country_id,
    }));

    await mysql.promiseQuery(`UPDATE ss_location SET ? WHERE sid = ?`, [updateLocation, updateLocation.sid]);

    const edit_uid = _.get(ctx, 'state.user', 0);
    _.merge(updateLocation, { edit_uid });

    await mysql.promiseQuery('INSERT INTO ss_location_AUDIT SET ?', updateLocation);
  }

  toClient() {
    if (!this.__location) throw new SSError('ServerError', 500).setMessage('Location was not loaded, cannot return location');

    return format.toClient(this.__location);
  }
}

/**
 * Returns a Location by Sid
 * @param {number} sid
 * @returns {Location}
 */
async function bySid(sid) {
  debug(`Getting Location by Sid: ${sid}`);
  const query = `
    SELECT
      ss_location.*,
      uc_zones.zone_code AS state,
      uc_countries.country_iso_code_2 AS country
    FROM ss_location
      INNER JOIN uc_countries USING(country_id)
      LEFT JOIN uc_zones ON ss_location.zone = uc_zones.zone_id
    WHERE sid = ?
  `;

  let result = await mysql.promiseQueryOne(query, sid);
  if (!result) throw new SSError('NotFound', 404).setMessage('Could not find location');

  let location = new Location(mergeLocationOffset(result));

  return location;
}

/**
 * Returns a single Location by account
 * @param {string} account
 * @returns {Location}
 */
async function byAccount(account) {
  debug(`Getting Location by Account: ${account}`);
  const query = `
    SELECT
      ss_location.*,
      uc_zones.zone_code AS state,
      uc_countries.country_iso_code_2 AS country
    FROM ss_location
      INNER JOIN ss_service USING(sid)
      INNER JOIN uc_countries ON ss_location.country_id = uc_countries.country_id
      LEFT JOIN uc_zones ON ss_location.zone = uc_zones.zone_id
    WHERE account = ?
    ORDER BY ss_service.s_status DESC LIMIT 1
  `;

  let result = await mysql.promiseQueryOne(query, account);
  if (!result) throw new SSError('NotFound', 404).setMessage('Could not find location');

  let location = new Location(mergeLocationOffset(result));

  return location;
}

/**
 * Returns a list of Locations by uid
 * @param {number} uid
 * @returns {Location[]}
 */
async function byUid(uid) {
  debug(`Getting Locations by Uid: ${uid}`);
  const query = `
    SELECT
      ss_location.*,
      uc_zones.zone_code AS state,
      uc_countries.country_iso_code_2 AS country
    FROM ss_location
      INNER JOIN uc_countries USING(country_id)
      LEFT JOIN uc_zones ON ss_location.zone = uc_zones.zone_id
    WHERE uid = ?
  `;

  let results = await mysql.promiseQueryMulti(query, uid);

  return _.map(results, result => new Location(mergeLocationOffset(result)));
}


function mergeLocationOffset(location) {
  let tz = C.TIMEZONES.TO_STRING[_.get(location, 'time_zone')];
  debug(`Converting timezone: ${tz}`);

  let momentZone = moment.tz.zone(tz);
  let locOffset = (-1) * momentZone.parse(moment().valueOf());

  _.merge(location, {
    locationOffset: locOffset,
  });

  return location;
}

const nameOutput = {
  name: Joi.string().allow(''),
  phone: Joi.string().allow(''),
};

function validOutput() {
  return {
    sid: Joi.number(),
    uid: Joi.number(),
    lStatus: Joi.number(),
    account: Joi.string().allow(''),
    street1: Joi.string().allow(''),
    street2: Joi.string().allow(''),
    crossStreet: Joi.string().allow(''),
    name: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zip: Joi.string().allow(''),
    county: Joi.string().allow(''),
    country: Joi.string(),
    notes: Joi.string().allow(''),
    residenceType: Joi.number(),
    numAdults: Joi.number(),
    numChildren: Joi.number(),
    safeWord: Joi.string().allow(''),
    signature: Joi.string().allow(''),
    timeZone: Joi.number(),
    locationOffset: Joi.number(),
    primaryContacts: Joi.array().items(nameOutput).max(2),
    secondaryContacts: Joi.array().items(nameOutput).max(5),
    videoVerification: Joi.boolean(),
    certificateUri: Joi.string().allow(''),
    licenseNumber: Joi.string().allow(''),
    licenseExpiration: Joi.number(),
    templateId: Joi.number(),
    names: Joi.string().allow('').allow(null),
    modified: Joi.number(),
    dispatchNumbers: {
      police1: Joi.string().allow(''),
      police2: Joi.string().allow(''),
      fire1: Joi.string().allow(''),
      fire2: Joi.string().allow(''),
      guard1: Joi.string().allow(''),
      guard2: Joi.string().allow(''),
    },
    securitasInfo: {
      siteNo: Joi.string().allow(''),
      sitestatId: Joi.string().allow(''),
      csNo: Joi.string().allow(''),
    },
  };
}

function validInput() {
  return {
    sid: Joi.number(),
    uid: Joi.number(),
    lStatus: Joi.number(),
    account: Joi.string(),
    street1: Joi.string().allow(''),
    street2: Joi.string().allow(''),
    crossStreet: Joi.string().allow(''),
    name: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zip: Joi.string().allow(''),
    county: Joi.string(),
    country: Joi.string(),
    notes: Joi.string().allow(''),
    residenceType: Joi.number(),
    numAdults: Joi.number(),
    numChildren: Joi.number(),
    safeWord: Joi.string(),
    signature: Joi.string(),
    timeZone: Joi.number(),
    primaryContacts: Joi.array().items({
      name: Joi.string().regex(/\S+\s+\S+/).allow(''),
      phone: Joi.string().allow(''),
    }).max(2),
    secondaryContacts: Joi.array().items(nameOutput).max(5),
    videoVerification: Joi.boolean(),
    licenseNumber: Joi.string().allow(''),
    licenseExpiration: Joi.number(),
    templateId: Joi.number(),
    names: Joi.string().allow('').allow(null),
    dispatchNumbers: {
      police1: Joi.string().allow(''),
      police2: Joi.string().allow(''),
      fire1: Joi.string().allow(''),
      fire2: Joi.string().allow(''),
      guard1: Joi.string().allow(''),
      guard2: Joi.string().allow(''),
    },
    securitasInfo: {
      siteNo: Joi.string().allow(''),
      sitestatId: Joi.string().allow(''),
      csNo: Joi.string().allow(''),
    },
  };
}

module.exports = {
  byAccount,
  bySid,
  byUid,
  validOutput,
  validInput,
};
