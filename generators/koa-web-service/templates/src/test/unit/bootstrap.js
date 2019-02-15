global.Promise = require('bluebird');
if (process.env.NODE_ENV !== 'ci') process.env.NODE_ENV = 'test';
