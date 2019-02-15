const _ = require('lodash');
const moment = require('moment');
const C = require('../../conf/constants');

function newSubscription(fields) {
  return {
    uid: _.get(fields, 'uid', -1),
    order_product_id: _.get(fields, 'order_product_id', 0),
    plan_sku: _.get(fields, 'plan_sku', ''),
    name: _.get(fields, 'name', ''),
    created: _.get(fields, 'created', moment().unix()),
    activated: _.get(fields, 'activated', 0),
    expires: _.get(fields, 'expires', 0),
    canceled: _.get(fields, 'canceled', 0),
    time: _.get(fields, 'time', C.ONE_MONTH_IN_SECONDS),
    extra_time: _.get(fields, 'extra_time', 0),
    renew: _.get(fields, 'renew', -1),
    price: _.get(fields, 'price', 0),
    extra_charge: _.get(fields, 'extra_charge', 0),
    s_status: _.get(fields, 's_status', 0),
    cim_ppid: _.get(fields, 'cim_ppid', 0),
    cim_uid: _.get(fields, 'cim_uid', -1),
    activation_code: _.get(fields, 'activation_code', ''),
    data: _.get(fields, 'data', ''),
    last_signal: _.get(fields, 'last_signal', 0),
    cancel_reason: _.get(fields, 'cancel_reason', null),
    system_version: _.get(fields, 'system_version', 20),
    dcid: _.get(fields, 'dcid', 0),
    dispatch_name: _.get(fields, 'dispatch_name', 'cops'),
    order_id: _.get(fields, 'order_id', 0),
    backup_cim_ppid: _.get(fields, 'backup_cim_ppid', null),
    currency_id: _.get(fields, 'currency_id', 840),
    country_id: _.get(fields, 'country_id', 840),
  };
}

module.exports = {
  newSubscription,
};
