<% if (dynamodb) { -%>
const dynamoose = require('dynamoose');
const {
  things
} = require('./services');
<% } -%>
const {
  asyncEndpoint,
} = require('./utils');

<% if (dynamodb) { -%>
// use local dynamo when running locally
if (process.env.STAGE === 'local') dynamoose.local('http://localhost:8000');

<% } -%>
exports.getThing = asyncEndpoint(async event => {
  const { id } = event.pathParameters || {};
  let thing = { id };
<% if (dynamodb) { -%>
  thing = await things.get(id);
<% } -%>
  if (!thing) return { statusCode: 404 };

  return { body: thing };
});
