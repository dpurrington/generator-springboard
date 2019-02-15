global.Promise = require('bluebird');
if (process.env.NODE_ENV !== 'ci') process.env.NODE_ENV = 'test';

const { MysqlMocker } = require('@simplisafe/ss_test_utils');
const mysql = require('@simplisafe/ss_mysql');
const conf = require('../../conf');

before(async function () {
  this.timeout(5000);

  await MysqlMocker.setup(mysql, conf, [
    'currencies',
    'permission',
    'role',
    'ss_comm',
    'ss_camera_service',
    'ss_events',
    'ss_event_recordings',
    'ss_event_stats',
    'ss_fulfill',
    'ss_gsm',
    'ss_location',
    'ss_nest',
    'ss_service',
    'ss_service_plan',
    'uc_cim',
    'uc_cim_payment_profiles',
    'uc_countries',
    'uc_zones',
    'users',
    'users_roles',
  ]);

  require('../../app');

  await Promise.delay(1000);
});
