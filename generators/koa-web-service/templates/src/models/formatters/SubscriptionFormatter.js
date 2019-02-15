/**
 * Formatter is a utility for formatting SQL results to a JS Object or array of objects
 */
const _ = require('lodash');
const { featuresFromData, dataFromFeatures } = require('./DataFormatter');

const toClient = (serviceRow, data) => {
  return {
    uid: parseInt(_.get(serviceRow, 'uid')),
    sid: parseInt(_.get(serviceRow, 'sid')),
    orderId: _.get(serviceRow, 'order_id'),
    orderProductId: _.get(serviceRow, 'order_product_id'),
    sStatus: parseInt(_.get(serviceRow, 's_status')),
    planSku: _.get(serviceRow, 'plan_sku'),
    planName: _.get(serviceRow, 'name'),
    currency: _.get(serviceRow, 'currency'),
    country: _.get(serviceRow, 'country'),
    data: _.get(serviceRow, 'data'),
    created: _.get(serviceRow, 'created'),
    activated: _.get(serviceRow, 'activated'),
    expires: _.get(serviceRow, 'expires'),
    canceled: _.get(serviceRow, 'canceled'),
    cancelReason: _.get(serviceRow, 'cancel_reason'),
    time: _.get(serviceRow, 'time'),
    extraTime: _.get(serviceRow, 'extra_time'),
    price: _.get(serviceRow, 'price'),
    extraCharge: _.get(serviceRow, 'extra_charge'),
    renew: _.get(serviceRow, 'renew'),
    lastSignal: _.get(serviceRow, 'last_signal'),
    activationCode: _.get(serviceRow, 'activation_code'),
    systemVersion: _.get(serviceRow, 'system_version'),
    dispatcher: _.get(serviceRow, 'dispatch_name'),
    creditCard: {
      ppid: _.get(serviceRow, 'cim_ppid'),
      backupPpid: _.get(serviceRow, 'backup_cim_ppid'),
      uid: _.get(serviceRow, 'cim_uid'),
      type: _.get(serviceRow, 'cc_type') || '',
      lastFour: _.get(serviceRow, 'last_four') || '',
    },
    upgradeStatus: _.get(data, 'upgrade_status'),
    features: featuresFromData(data),
  };
};

const fromClient = (service) => {
  return {
    uid: _.get(service, 'uid'),
    sid: _.get(service, 'sid'),
    s_status: _.get(service, 'sStatus'),
    order_id: _.get(service, 'orderId'),
    order_product_id: _.get(service, 'orderProductId'),
    plan_sku: _.get(service, 'planSku'),
    name: _.get(service, 'planName'),
    expires: _.get(service, 'expires'),
    renew: _.get(service, 'renew'),
    extra_charge: _.get(service, 'extraCharge'),
    currency: _.get(service, 'currency'),
    country: _.get(service, 'country'),
    activation_code: _.get(service, 'activationCode'),
    system_version: _.get(service, 'systemVersion'),
    dispatch_name: _.get(service, 'dispatcher'),
    data: _.get(service, 'features') ? dataFromFeatures(_.get(service, 'features', {})) : undefined,
    backup_cim_ppid: _.get(service, 'creditCard.backupPpid'),
    cim_ppid: _.get(service, 'creditCard.ppid'),
    cim_uid: _.get(service, 'creditCard.uid'),
  };
};

/**
 * Only return fields that exist in the database
 */
function clean (service) {
  return _.pick(service, [
    'sid',
    'uid',
    'order_product_id',
    'plan_sku',
    'name',
    'created',
    'activated',
    'expires',
    'canceled',
    'time',
    'extra_time',
    'renew',
    'price',
    'extra_charge',
    's_status',
    'cim_ppid',
    'cim_uid',
    'activation_code',
    'data',
    'last_signal',
    'cancel_reason',
    'system_version',
    'dcid',
    'dispatch_name',
    'order_id',
    'backup_cim_ppid',
    'currency_id',
    'country_id',
  ]);
}

module.exports = {
  featuresFromData,
  dataFromFeatures,
  toClient,
  fromClient,
  clean,
};
