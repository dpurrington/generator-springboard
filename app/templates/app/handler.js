const dynamoose = require('dynamoose');
const {
  things
} = require('./services');
const {
  asyncEndpoint,
  swaggerHandler
} = require('./utils');

// use local dynamo when running locally
if (process.env.STAGE === 'local') dynamoose.local('http://localhost:8000');

// swager ui for docs
exports.swagger = swaggerHandler('/swagger-ui');

// --- <things> you replace with your own domain objects ---

exports.getThing = asyncEndpoint(async event => {
  const { id } = event.pathParameters || {};
  const thing = things.get(id);
  return { body: { thing } };
});
