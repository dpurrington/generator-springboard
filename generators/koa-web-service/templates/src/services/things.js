const Thing = require('../models/Thing');
const { ResponseError } = require('../utils');

module.exports = {
  get(id) {
    if (!id) throw ResponseError('get thing requires id', 409);
    return Thing.get(id);
  },
};
