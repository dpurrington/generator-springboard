const conf = require('../conf');
const C = require('../conf/constants');
const _ = require('lodash');
const mysql = require('@simplisafe/ss_mysql');
const debug = require('debug')('falcon:lib:utils');
const SSError = require('@simplisafe/ss_error').SSError;

function getCimTables() {
  let transMode = _.get(conf, 'cim.transactionMode', 'production');
  return {
    paymentProfilesTable: transMode === 'test' ? 'uc_cim_payment_profiles_TEST' : 'uc_cim_payment_profiles',
    profilesTable: transMode === 'test' ? 'uc_cim_TEST' : 'uc_cim',
  };
}

async function getBSVersion(account) {
  let result = await mysql.promiseQueryOne('SELECT version FROM ss_fulfill WHERE account = ?', account);

  if (result) return _.get(result, 'version');

  if (account && account.startsWith('X')) return 0;

  return account && account.length === 8 ? 3 : 2;
}

async function accountToSid(account) {
  let result = await mysql.promiseQueryOne('SELECT ss_location.sid as sid FROM ss_location INNER JOIN ss_service USING(sid) WHERE account = ? AND s_status >= 10', account);
  return _.get(result, 'sid', null);
}

async function sidToAccount(sid) {
  let result = await mysql.promiseQueryOne('SELECT account FROM ss_location WHERE sid = ?', sid);
  return _.get(result, 'account', null);
}

const stripCountry = plan => _.split(plan, '_')[0];

function isDowngradeToCamera (currentSku, newSku) {
  const CAMERA_PLANS = [ C.SERVICE_PLANS.BLANK, C.SERVICE_PLANS.CAMERA_ONLY, C.SERVICE_PLANS.CAMERA_UNLIMITED ];

  debug(`Checking camera downgrade for current sku: ${currentSku} to new sku: ${newSku}`);

  // If the new plan is a camera plan only allow it to be applied to other camera plans
  if (_.includes(CAMERA_PLANS, stripCountry(newSku)) && !_.includes(CAMERA_PLANS, stripCountry(currentSku))) {
    return true;
  }

  return false;
}


module.exports = {
  getCimTables,
  getBSVersion,
  accountToSid,
  sidToAccount,
  stripCountry,
  isDowngradeToCamera,
};
