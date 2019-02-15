require('./bootstrap');

const conf = require('../../conf');
const _  = require('lodash');
const chai = require('chai');
const supertest = require('supertest');

const request = supertest(`http://localhost:${_.get(conf, 'server.port')}`);
const expect = chai.expect;

describe('Health Check', () => {
  it('should return ok for the health check', async () => {
    let res = await request.get('/v1/healthCheck');
    expect(res).to.have.property('statusCode', 200);
    expect(res.body).to.deep.equal({
      mysql: 'ok',
    });
  });
});
