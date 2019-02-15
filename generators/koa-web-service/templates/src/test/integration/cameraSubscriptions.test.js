require('./bootstrap');

const conf = require('../../conf');
const _ = require('lodash');
const chai = require('chai');
const moment = require('moment');
const supertest = require('supertest');
const debug = require('debug')('falcon:test:cameras');

const request = supertest(`http://localhost:${_.get(conf, 'server.port')}`);
const expect = chai.expect;

const { MysqlMocker, utils } = require('@simplisafe/ss_test_utils');
const { checkResult } = utils;
const { C, build } = MysqlMocker;

const { ONE_MONTH_IN_SECONDS } = require('../../conf/constants');

chai.use(require('chai-shallow-deep-equal'));

const checkAuditRows = async (numRows = 0, sid = C.SID) => {
  let rows = await MysqlMocker.findAll(`SELECT * FROM ss_camera_service_AUDIT WHERE sid = ${sid}`);
  expect(rows).to.have.lengthOf(numRows);

  return rows;
};

describe('Camera Subscription APIs', () => {
  afterEach(async () => {
    await MysqlMocker.clearTable('ss_camera_service');
    await MysqlMocker.clearTable('ss_camera_service_AUDIT');
  });

  describe('GET /cameras/:uuid', () => {
    beforeEach(async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService());
    });

    it('should get camera service by uuid and sid', async () => {
      let res = await request.get(`/v1/cameras/${C.UUID}?sid=${C.SID}`);
      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID,
        },
      });
    });

    it('should return not found if there isnt a camera sub', async () => {
      let res = await request.get(`/v1/cameras/${C.UUID2}?sid=${C.SID}`);
      checkResult(res, 404, {
        type: 'NotFound',
        statusCode: 404,
      });
    });

    it('should reject an invalid query parameter', async () => {
      let res = await request.get(`/v1/cameras/${C.UUID}?sid=${C.SID}&boop=1`);
      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });

    it('should reject a request without a sid', async () => {
      let res = await request.get(`/v1/cameras/${C.UUID}`);
      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });
  });

  describe('POST /cameras/:uuid', () => {
    it('should create a new subscription with fields', async () => {
      let res = await request.post(`/v1/cameras/${C.UUID}`).send({
        uid: C.UID,
        sid: C.SID,
      });

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID,
          recordingLifetime: ONE_MONTH_IN_SECONDS,
          time: ONE_MONTH_IN_SECONDS,
          canceled: 0,
        },
      });

      expect(res.body.subscription.expires).to.be.gte(moment().add(1, 'week').unix());

      let dbRow = await MysqlMocker.findOne(`SELECT * FROM ss_camera_service WHERE uuid = '${C.UUID}' AND sid = ${C.SID}`);
      expect(dbRow).to.shallowDeepEqual({
        uid: C.UID,
        recording_lifetime: ONE_MONTH_IN_SECONDS,
        time: ONE_MONTH_IN_SECONDS,
      });
    });

    it('should fail to create a subscription if the UUID and Sid combo already exists', async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService());

      let res = await request.post(`/v1/cameras/${C.UUID}`).send({
        uid: C.UID,
        sid: C.SID,
      });

      checkResult(res, 409, {
        type: 'Conflict',
      });
    });

    it('should fail if required fields are missing', async () => {
      let res = await request.post(`/v1/cameras/${C.UUID}`).send({ uid: C.UID });
      checkResult(res, 400, { type: 'ValidationError' });

      let res2 = await request.post(`/v1/cameras/${C.UUID}`).send({ sid: C.SID });
      checkResult(res2, 400, { type: 'ValidationError' });

      let res3 = await request.post(`/v1/cameras/${C.UUID}`).send({});
      checkResult(res3, 400, { type: 'ValidationError' });
    });

    it('should fail if you try to pass in invalid fields', async () => {
      let res = await request.post(`/v1/cameras/${C.UUID}`).send({ uid: C.UID, sid: C.SID, bubbles: true });
      checkResult(res, 400, { type: 'ValidationError' });
    });
  });

  describe('PUT /cameras/:uuid', () => {
    beforeEach(async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService());
    });

    it('should let you update fields on an existing camera service', async () => {
      let res = await request.put(`/v1/cameras/${C.UUID}`).send({
        sid: C.SID,
        uid: C.UID,
        uuid: C.UUID,
        planSku: 'SSVM2',
        price: 1000,
      });

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID,
          planSku: 'SSVM2',
          price: 1000,
        },
      });

      let dbRow = await MysqlMocker.findOne(`SELECT * FROM ss_camera_service WHERE uuid = '${C.UUID}' AND sid = ${C.SID}`);
      expect(dbRow).to.shallowDeepEqual({
        sid: C.SID,
        uid: C.UID,
        uuid: C.UUID,
        plan_sku: 'SSVM2',
        price: 1000,
        canceled: 0,
      });
    });

    it('should return a 404 if you try to update a camera that doesnt exist', async () => {
      let res = await request.put(`/v1/cameras/${C.UUID2}`).send({
        sid: C.SID,
        uid: C.UID,
        uuid: C.UUID2,
        planSku: 'SSVM2',
        price: 1000,
      });
      checkResult(res, 404, {
        type: 'NotFound',
      });
    });

    it('should reject requests without a uid or sid', async () => {
      it('should fail if required fields are missing', async () => {
        let res = await request.put(`/v1/cameras/${C.UUID}`).send({ uid: C.UID });
        checkResult(res, 400, { type: 'ValidationError' });

        let res2 = await request.put(`/v1/cameras/${C.UUID}`).send({ sid: C.SID });
        checkResult(res2, 400, { type: 'ValidationError' });

        let res3 = await request.put(`/v1/cameras/${C.UUID}`).send({});
        checkResult(res3, 400, { type: 'ValidationError' });
      });
    });

    it('should reject a request that has invalid fields in the body', async () => {
      let res = await request.put(`/v1/cameras/${C.UUID2}`).send({
        sid: C.SID,
        uid: C.UID,
        uuid: C.UUID2,
        planSku: 'SSVM2',
        price: 1000,
        bubbles: true,
      });
      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });
  });

  describe('POST /cameras/:uuid/:sid/cancel', () => {
    beforeEach(async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService());
    });

    it('should cancel an existing camera subcription', async () => {
      let res = await request.post(`/v1/cameras/${C.UUID}/${C.SID}/cancel`).set({
        'X-UID': 5555,
      }).send();
      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID,
          expires: 0,
        },
      });
      expect(res.body.subscription.canceled).to.be.gte(moment().subtract(1, 'minute').unix());

      const dbRow = await MysqlMocker.findOne(`SELECT * FROM ss_camera_service WHERE sid = ${C.SID} and uuid = '${C.UUID}'`);
      expect(dbRow).to.have.property('expires', 0);
      expect(dbRow).to.have.property('canceled').gte(moment().subtract(1, 'minute').unix());

      const auditRows = await checkAuditRows(1);
      expect(auditRows[0]).to.have.property('edit_uid', 5555);
    });

    it('should return a 404 if it doesnt exist', async () => {
      let res = await request.post(`/v1/cameras/${C.UUID2}/${C.SID}/cancel`).set({
        'X-Request-UID': 5555,
      }).send();
      checkResult(res, 404, { type: 'NotFound' });
      await checkAuditRows(0);
    });

    it('should reject a request that has an invalid sid', async () => {
      let res = await request.post(`/v1/cameras/${C.UUID2}/ABCDEFGH12345/cancel`).send();
      checkResult(res, 400, { type: 'ValidationError' });
    });
  });

  describe('POST /cameras/:uuid/:sid/activate', () => {
    beforeEach(async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService({
        expires: 0,
        canceled: moment().subtract(1, 'year').unix(),
      }));
    });

    it('should activate an existing camera subcription', async () => {
      let res = await request.post(`/v1/cameras/${C.UUID}/${C.SID}/activate`).set({
        'X-UID': 5555,
      }).send();
      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID,
          canceled: 0,
        },
      });
      expect(res.body.subscription.expires).to.be.gte(moment().add(1, 'week').unix());

      const dbRow = await MysqlMocker.findOne(`SELECT * FROM ss_camera_service WHERE sid = ${C.SID} and uuid = '${C.UUID}'`);
      expect(dbRow).to.have.property('canceled', 0);
      expect(dbRow).to.have.property('expires').gte(moment().add(1, 'week').unix());

      const auditRows = await checkAuditRows(1);
      expect(auditRows[0]).to.have.property('edit_uid', 5555);
    });

    it('should return a 404 if it doesnt exist', async () => {
      let res = await request.post(`/v1/cameras/${C.UUID2}/${C.SID}/activate`).set({
        'X-Request-UID': 5555,
      }).send();
      checkResult(res, 404, { type: 'NotFound' });
      await checkAuditRows(0);
    });

    it('should reject a request that has an invalid sid', async () => {
      let res = await request.post(`/v1/cameras/${C.UUID2}/ABCDEFGH12345/activate`).send();
      checkResult(res, 400, { type: 'ValidationError' });
    });
  });

  describe('GET /cameras', () => {
    beforeEach(async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService());
    });

    it('should get cameras by uid', async () => {
      let res = await request.get(`/v1/cameras?uid=${C.UID}`);
      checkResult(res, 200, {
        subscriptions: [{
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID,
        }],
      });

      expect(res.body.subscriptions).to.have.lengthOf(1);
    });

    it('should get cameras by sid', async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService({ csid: 2, uuid: C.UUID2 }));
      let res = await request.get(`/v1/cameras?sid=${C.SID}`);

      res.body.subscriptions = _.sortBy(res.body.subscriptions, 'uuid');

      checkResult(res, 200, {
        subscriptions: [{
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID,
        }, {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID2,
        }],
      });

      expect(res.body.subscriptions).to.have.lengthOf(2);
    });

    it('should return nothing if nothing is there', async () => {
      let res = await request.get(`/v1/cameras?sid=${C.SID2}`);
      checkResult(res, 200, {
        subscriptions: [],
      });

      expect(res.body.subscriptions).to.have.lengthOf(0);
    });

    it('should return an error if no sid or uid was given', async () => {
      let res = await request.get(`/v1/cameras`);
      checkResult(res, 400, {
        type: 'InvalidParameter',
        statusCode: 400,
      });
    });

    it('should reject an invalid query parameter', async () => {
      let res = await request.get(`/v1/cameras?sid=${C.SID}&party=WOOOO`);
      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });
  });
});
