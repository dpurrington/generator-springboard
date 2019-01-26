<% if (dynamodb) { -%>
const dynamoose = require('dynamoose');
const {
  things
} = require('./services');
<% } -%>
const {
<% if (serviceType === 'web service') { -%>
  asyncEndpoint,
  swaggerHandler,
<% } -%>
  logger,
} = require('./utils');

<% if (dynamodb) { -%>
// use local dynamo when running locally
if (process.env.STAGE === 'local') dynamoose.local('http://localhost:8000');

<% } -%>
<% if (serviceType === 'web service') { -%>
// swagger ui for docs
exports.swagger = swaggerHandler('/swagger-ui');

<% } -%>
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
<% if (dynamodb) { -%>
  logger.info(things);
<% } -%>
};
<% } -%>
