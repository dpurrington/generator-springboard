require('./bootstrap');

const conf = require('../../conf');
const _ = require('lodash');
const chai = require('chai');
const supertest = require('supertest');
const debug = require('debug')('falcon:test:plans');

const request = supertest(`http://localhost:${_.get(conf, 'server.port')}`);
const expect = chai.expect;

const { MysqlMocker, utils } = require('@simplisafe/ss_test_utils');
const { checkResult } = utils;
const { C } = MysqlMocker;

chai.use(require('chai-shallow-deep-equal'));

describe('Service Plans APIs', () => {
  describe('GET /plans', () => {
    it('Should return all plans for a country', async () => {
      let res = await request.get(`/v1/plans?country=us`).send();

      debug(res.body);
      expect(res.body.plans).to.have.lengthOf(15);

      checkResult(res, 200, {
        country: 'US',
        plans: [], // empty will pass shallow-deep-equal don't check all 15
      });

      // Just check one of them
      let interactive = _.find(res.body.plans, { planSku: C.SKUS.INTERACTIVE });
      expect(interactive).to.shallowDeepEqual({
        planSku: C.SKUS.INTERACTIVE,
        name: C.PLAN_NAMES.INTERACTIVE,
        price: C.PLAN_PRICE.INTERACTIVE,
      });
    });

    it('Should return all plans for the UK', async () => {
      let res = await request.get(`/v1/plans?country=gb`).send();

      debug(res.body);
      expect(res.body.plans).to.have.lengthOf(5);

      checkResult(res, 200, {
        country: 'GB',
        plans: [], // empty will pass shallow-deep-equal don't check all 5
      });

      // Just check one of them
      let interactive = _.find(res.body.plans, { planSku: C.SKUS.INTERACTIVE_GB });
      expect(interactive).to.shallowDeepEqual({
        planSku: C.SKUS.INTERACTIVE_GB,
        name: C.PLAN_NAMES.INTERACTIVE_GB,
        price: C.PLAN_PRICE.INTERACTIVE_GB,
      });
    });

    it('should return an error if country is not sent in the query', async () => {
      let res = await request.get(`/v1/plans`).send();

      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });
  });
});
