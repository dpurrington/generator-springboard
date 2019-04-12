const _ = require('lodash');
let conf = {};

conf.env = _.get(process, 'env.NODE_ENV', 'test');

conf.server = {
  port: 3113,
};

conf.log = {
  disable: true,
  toConsole: true,
  enableStackTrace: _.get(process, 'env.FALCON_LOG_STACKTRACE', false) === 'true',
  name: 'falcon.log',
  serverName: 'falcon-server.log',
  location: _.get(process, 'env.FALCON_LOG_LOCATION', './logs'),
  level: 'info',
};

conf.consul = {
  host: _.get(process, 'env.FALCON_CONSUL_HOST', 'localhost'),
  port: '8500',
  promisify: true,
};

conf.mysql = {
  database: _.get(process, 'env.FALCON_MYSQL_DATABASE', 'test'),
  user: _.get(process, 'env.FALCON_MYSQL_USER', 'root'),
  password: _.get(process, 'env.FALCON_MYSQL_PASSWORD', ''),
  connectionLimit: 20,
};

module.exports = conf;
