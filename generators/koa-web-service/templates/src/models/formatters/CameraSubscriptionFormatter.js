const _ = require('lodash');
const C = require('../../conf/constants');
const moment = require('moment');

function fromClient(updates) {
  let toUpdate = {
    expires: _.get(updates, 'expires'),
    time: _.get(updates, 'time'),
    extra_time: _.get(updates, 'extraTime'),
    price: _.get(updates, 'price'),
    recording_lifetime: _.get(updates, 'recordingLifetime'),
    plan_sku: _.get(updates, 'planSku'),
  };

  if (_.has(updates, 'trialUsed')) toUpdate.trial_used = updates.trialUsed ? 1 : 0;

  return toUpdate;
}

function toClient(sub) {
  return {
    uid: _.get(sub, 'uid'),
    sid: _.get(sub, 'sid'),
    uuid: _.get(sub, 'uuid'),
    recordingLifetime: _.toInteger(_.get(sub, 'recording_lifetime')),
    planSku: _.get(sub, 'plan_sku'),
    price: _.get(sub, 'price'),
    created: _.get(sub, 'created'),
    expires: _.get(sub, 'expires'),
    canceled: _.get(sub, 'canceled'),
    time: _.get(sub, 'time'),
    extraTime: _.get(sub, 'extra_time'),
    trialUsed: Boolean(_.get(sub, 'trial_used')),
  };
}

function createDefaults() {
  return {
    recording_lifetime: C.ONE_MONTH_IN_SECONDS,
    plan_sku: 'SSVM1',
    price: 0,
    created: moment().unix(),
    expires: moment().add(1, 'month').unix(),
    canceled: 0,
    time: C.ONE_MONTH_IN_SECONDS,
    extra_time: 0,
    trial_used: 0,
  };
}

function clean(sub) {
  return _.pick(sub, [
    'csid',
    'uid',
    'sid',
    'uuid',
    'recording_lifetime',
    'plan_sku',
    'price',
    'created',
    'expires',
    'canceled',
    'time',
    'extra_time',
    'trial_used',
  ]);
}

module.exports = {
  fromClient,
  toClient,
  createDefaults,
  clean,
};
