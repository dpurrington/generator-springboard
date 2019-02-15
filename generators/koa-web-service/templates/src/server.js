const serverless = require('aws-serverless-koa');
const app = require('./app');

exports.handler = serverless(app);
