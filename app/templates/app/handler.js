const dynamoose = require('dynamoose');
const {
  things
} = require('./services');
const {
<% if (serviceType === 'web service') { -%>
  asyncEndpoint,
  swaggerHandler,
<% } -%>
  logger,
} = require('./utils');

// use local dynamo when running locally
if (process.env.STAGE === 'local') dynamoose.local('http://localhost:8000');

// swager ui for docs
<% if (serviceType === 'web service') { -%>
exports.swagger = swaggerHandler('/swagger-ui');
<% } -%>

// --- <things> you replace with your own domain objects ---
<% if (serviceType === 'web service') { -%>
exports.getThing = asyncEndpoint(async event => {
  const { id } = event.pathParameters || {};
  const thing = things.get(id);
  return { body: { thing } };
});
<% } -%>
<% if (serviceType === 'scheduled task') { -%>
exports.doThing = event => {
  // your code goes here
  logger.info(event);
  logger.info(things);
};
<% } -%>
