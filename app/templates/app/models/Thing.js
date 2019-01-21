const dynamoose = require('dynamoose');
const uuid = require('uuid/v4');

const { MAIN_TABLE } = process.env;
const schema = new dynamoose.Schema({
  id: {
    type: String,
    default: uuid,
    hashKey: true
  },
}, { /* table options */ });

module.exports = dynamoose.model(MAIN_TABLE, schema);
