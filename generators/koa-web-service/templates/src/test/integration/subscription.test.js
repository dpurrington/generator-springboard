require('./bootstrap');

const conf = require('../../conf');
const _ = require('lodash');
const chai = require('chai');
const moment = require('moment');
const supertest = require('supertest');
const debug = require('debug')('falcon:test:subscription');

const request = supertest(`http://localhost:${_.get(conf, 'server.port')}`);
const expect = chai.expect;

const { unserialize } = require('@simplisafe/ss_mysql');

const { MysqlMocker, utils } = require('@simplisafe/ss_test_utils');
const { checkResult } = utils;
const { C, build } = MysqlMocker;

const { ONE_MONTH_IN_SECONDS } = require('../../conf/constants');

chai.use(require('chai-shallow-deep-equal'));

describe('Subscription APIs', () => {
  beforeEach(async () => {
    try {
      await MysqlMocker.insert('ss_location', build.location());
      await MysqlMocker.insert('ss_service', build.interactiveSubscription());
      await MysqlMocker.insert('uc_cim_payment_profiles_TEST', build.paymentProfile());
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(async () => {
    await MysqlMocker.clearTable('ss_location');
    await MysqlMocker.clearTable('ss_location_AUDIT');
    await MysqlMocker.clearTable('ss_service');
    await MysqlMocker.clearTable('ss_service_AUDIT');
    await MysqlMocker.clearTable('uc_cim_payment_profiles_TEST');
  });

  describe('GET /subscriptions/:sid', () => {
    it('Should return a subscription by sid', async () => {
      let res = await request.get(`/v1/subscriptions/${C.SID}`).send();

      debug(res.body);

      expect(res).to.have.property('statusCode', 200);

      expect(res.body).to.have.property('subscription');
      expect(res.body).to.have.property('location');
    });
  });

  describe('PUT /subscriptions/:sid', () => {
    it('should let you update a single subscription field', async () => {
      let res = await request.put(`/v1/subscriptions/${C.SID}`).set('x-uid', 1234).send({
        dispatcher: 'securitas',
      });

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          planSku: 'SSEDSM2',
          dispatcher: 'securitas',
        },
      });

      let audits = await checkAudits(C.SID, 1);
      expect(audits[0]).to.shallowDeepEqual({
        edit_uid: 1234,
        dispatch_name: 'securitas',
        plan_sku: 'SSEDSM2',
        backup_cim_ppid: null,
      });
    });

    it('should let you update a few fields', async () => {
      let res = await request.put(`/v1/subscriptions/${C.SID}`).set('x-uid', 1234).send({
        dispatcher: 'securitas',
        currency: 'GBP',
        country: 'GB',
        upgradeStatus: 0,
        features: {
          cameras: 10,
        },
      });

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          planSku: 'SSEDSM2',
          dispatcher: 'securitas',
          country: 'GB',
          currency: 'GBP',
          upgradeStatus: 0,
        },
      });

      let audits = await checkAudits(C.SID, 1);
      expect(audits[0]).to.shallowDeepEqual({
        edit_uid: 1234,
        dispatch_name: 'securitas',
        plan_sku: 'SSEDSM2',
        backup_cim_ppid: null,
        country_id: 826,
        currency_id: 826,
      });

      let data = unserialize(audits[0].data);

      expect(data).to.have.property('upgrade_status', 0);
      expect(data.features.cameras).to.have.property('enable', 1);
      expect(data.features.cameras).to.have.property('value', 10);
    });

    it('should let you update features independantly', async () => {
      let res = await request.put(`/v1/subscriptions/${C.SID}`).set('x-uid', 1234).send({
        dispatcher: 'securitas',
        currency: 'GBP',
        country: 'GB',
        upgradeStatus: 0,
        features: {
          monitoring: true,
          online: false,
          alerts: true,
          video: false,
          hazard: true,
          cameras: 10,
        },
      });

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          planSku: 'SSEDSM2',
          dispatcher: 'securitas',
          country: 'GB',
          currency: 'GBP',
          upgradeStatus: 0,
          features: {
            monitoring: true,
            online: false,
            alerts: true,
            video: false,
            hazard: true,
            cameras: 10,
          },
        },
      });

      let audits = await checkAudits(C.SID, 1);
      expect(audits[0]).to.shallowDeepEqual({
        edit_uid: 1234,
        dispatch_name: 'securitas',
        plan_sku: 'SSEDSM2',
        backup_cim_ppid: null,
        country_id: 826,
        currency_id: 826,
      });

      let data = unserialize(audits[0].data);

      expect(data).to.have.property('upgrade_status', 0);
      expect(data.features.monitoring).to.have.property('enable', 1);
      expect(data.features.online).to.have.property('enable', 0);
      expect(data.features.alerts).to.have.property('enable', 1);
      expect(data.features.video).to.have.property('enable', 0);
      expect(data.features.hazard).to.have.property('enable', 1);
      expect(data.features.cameras).to.have.property('enable', 1);
      expect(data.features.cameras).to.have.property('value', 10);
    });

    it('should let you set cameras to zero', async () => {
      let res = await request.put(`/v1/subscriptions/${C.SID}`).set('x-uid', 1234).send({
        dispatcher: 'securitas',
        currency: 'GBP',
        country: 'GB',
        upgradeStatus: 0,
        features: {
          monitoring: false,
          cameras: 0,
        },
      });

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          planSku: 'SSEDSM2',
          dispatcher: 'securitas',
          country: 'GB',
          currency: 'GBP',
          upgradeStatus: 0,
          features: {
            monitoring: false,
            alerts: true,
            online: true,
            cameras: 0,
          },
        },
      });

      let audits = await checkAudits(C.SID, 1);
      expect(audits[0]).to.shallowDeepEqual({
        edit_uid: 1234,
        dispatch_name: 'securitas',
        plan_sku: 'SSEDSM2',
        backup_cim_ppid: null,
        country_id: 826,
        currency_id: 826,
      });

      let data = unserialize(audits[0].data);

      expect(data).to.have.property('upgrade_status', 0);
      expect(data.features.monitoring).to.have.property('enable', 0);
      expect(data.features.cameras).to.have.property('enable', 0);
      expect(data.features.cameras).to.have.property('value', 0);
    });

    it('should reject if you dont pass in a location object to update', async () => {
      let res = await request.put(`/v1/subscriptions/${C.SID}`).send();

      checkResult(res, 400, {
        type: 'BadRequestError',
      });
    });

    it('should reject if a param is of the wrong type', async () => {
      let res = await request.put(`/v1/subscriptions/${C.SID}`).send({ planSku: true });

      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });

    it('should reject if a param is sent that isnt in the validation list', async () => {
      let res = await request.put(`/v1/subscriptions/${C.SID}`).send({ videoVerification: true });

      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });
  });

  describe('GET /subscriptions/user/:uid', () => {
    it('should get all subscriptions for a user by uid', async () => {
      let res = await request.get(`/v1/subscriptions/user/${C.UID}`).send();

      expect(res).to.have.property('statusCode', 200);

      expect(res.body.subscriptions).to.have.lengthOf(1);
      expect(res.body).to.shallowDeepEqual({
        uid: C.UID,
        subscriptions: [{
          subscription: {
            sid: C.SID,
          },
          location: {
            sid: C.SID,
          },
        }],
      });
    });

    it('should get all subscriptions for a user by uid even if there isnt a location', async () => {
      await MysqlMocker.insert('ss_service', build.blankSubscription({ sid: C.SID2 }));
      let res = await request.get(`/v1/subscriptions/user/${C.UID}`).send();

      expect(res).to.have.property('statusCode', 200);

      expect(res.body.subscriptions).to.have.lengthOf(2);
      expect(res.body).to.shallowDeepEqual({
        uid: C.UID,
        subscriptions: [{
          subscription: {
            sid: C.SID,
            sStatus: 20,
          },
          location: {
            sid: C.SID,
          },
        }, {
          subscription: {
            sid: C.SID2,
            sStatus: 7,
          },
          location: undefined,
        }],
      });
    });


    it('should get all subscriptions for a user by uid even if there isnt a location and order everything properly', async () => {
      const SID3 = 140000;
      await MysqlMocker.insert('ss_service', build.blankSubscription({ sid: C.SID2 }));
      await MysqlMocker.insert('ss_service', build.standardSubscription({ sid: SID3, s_status: 10 }));
      await MysqlMocker.insert('ss_location', build.location({ sid: SID3 }));
      let res = await request.get(`/v1/subscriptions/user/${C.UID}`).send();

      expect(res).to.have.property('statusCode', 200);

      expect(res.body.subscriptions).to.have.lengthOf(3);
      expect(res.body).to.shallowDeepEqual({
        uid: C.UID,
        subscriptions: [{
          subscription: {
            sid: C.SID,
            sStatus: 20,
          },
          location: {
            sid: C.SID,
          },
        }, {
          subscription: {
            sid: SID3,
            sStatus: 10,
          },
          location: {
            sid: SID3,
          },
        }, {
          subscription: {
            sid: C.SID2,
            sStatus: 7,
          },
          location: undefined,
        }],
      });
    });

    it('should return nothing if the user doesnt have any subscriptions', async () => {
      let res = await request.get(`/v1/subscriptions/user/12345`).send();

      expect(res).to.have.property('statusCode', 200);

      expect(res.body.subscriptions).to.have.lengthOf(0);
      expect(res.body).to.shallowDeepEqual({
        uid: 12345,
        subscriptions: [],
      });
    });
  });

  describe('POST /subscriptions/plan/:sku', () => {
    it('should create a new subscription with a sku and default any fields not sent', async () => {
      let res = await request.post(`/v1/subscriptions/plan/SSEDSM2`).send({});

      debug(res.body);
      checkResult(res, 200, {
        subscription: {
          uid: -1,
          orderProductId: 0,
          sStatus: 0,
          planSku: C.SKUS.INTERACTIVE,
          planName: C.PLAN_NAMES.INTERACTIVE,
          price: C.PLAN_PRICE.INTERACTIVE,
          activated: 0,
          expires: 0,
          canceled: 0,
          cancelReason: null,
          extraCharge: 0,
          activationCode: '',
          dispatcher: 'cops',
          time: ONE_MONTH_IN_SECONDS,
          country: 'US',
          currency: 'USD',
          orderId: 0,
          lastSignal: 0,
        },
      });

      expect(res.body.subscription.created).to.be.gte(moment().subtract(2, 'minutes').unix());

      await checkDatabase(_.get(res, 'body.subscription.sid'), 1);
    });

    it('should let you specify an activation code for the subscription', async () => {
      const CODE = 'ABCD1234';
      let res = await request.post(`/v1/subscriptions/plan/SSEDSM2`).send({ activationCode: CODE });

      checkResult(res, 200, {
        subscription: {
          uid: -1,
          planSku: C.SKUS.INTERACTIVE,
          planName: C.PLAN_NAMES.INTERACTIVE,
          activationCode: CODE,
        },
      });

      await checkDatabase(_.get(res, 'body.subscription.sid'), 1);
    });

    it('should pick a UK plan and default to the right dispatcher', async () => {
      const CODE = '1234ABCD';
      let res = await request.post(`/v1/subscriptions/plan/SSEDSM2_GB`).send({ activationCode: CODE });


      checkResult(res, 200, {
        subscription: {
          uid: -1,
          planSku: C.SKUS.INTERACTIVE_GB,
          planName: C.PLAN_NAMES.INTERACTIVE_GB,
          price: C.PLAN_PRICE.INTERACTIVE_GB,
          activationCode: CODE,
          dispatcher: 'securitas',
          country: 'GB',
          currency: 'GBP',
        },
      });

      await checkDatabase(_.get(res, 'body.subscription.sid'), 1);
    });

    it('should create a plan for a user and set proper fields', async () => {
      const UID = 1234500;
      const ORDER_ID = 123123123;
      const PPID = 12341234;

      let res = await request.post(`/v1/subscriptions/plan/SSEDBM1`).send({
        uid: UID,
        orderId: ORDER_ID,
        creditCard: {
          ppid: PPID,
          uid: UID,
        },
      });

      checkResult(res, 200, {
        subscription: {
          uid: UID,
          orderId: ORDER_ID,
          planSku: C.SKUS.STANDARD,
          planName: C.PLAN_NAMES.STANDARD,
          price: C.PLAN_PRICE.STANDARD,
          creditCard: {
            ppid: PPID,
            backupPpid: null,
            uid: UID,
            lastFour: '',
            type: '',
          },
          country: 'US',
          currency: 'USD',
        },
      });

      let subs = await checkDatabase(_.get(res, 'body.subscription.sid'), 1);
      expect(subs[0]).to.shallowDeepEqual({
        uid: UID,
        order_id: ORDER_ID,
        cim_uid: UID,
        cim_ppid: PPID,
        name: C.PLAN_NAMES.STANDARD,
        plan_sku: C.SKUS.STANDARD,
        price: C.PLAN_PRICE.STANDARD,
        country_id: 840,
        currency_id: 840,
      });
    });

    it('should reject trying to set certain fields on create', async () => {
      let res = await request.post(`/v1/subscriptions/plan/SSEDBM1`).send({
        planName: 'MY COOL PLAN',
      });

      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });
  });

  describe('POST /subscriptions/:sid/apply/:sku', () => {
    it('should apply a plan sku to an existing subscription and downgrade to standard from interactive', async () => {
      let res = await request.post(`/v1/subscriptions/${C.SID}/apply/${C.SKUS.STANDARD}`);

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          planSku: C.SKUS.STANDARD,
          price: C.PLAN_PRICE.STANDARD,
          planName: C.PLAN_NAMES.STANDARD,
          country: 'US',
          currency: 'USD',
          sStatus: 20,
        },
      });

      let subs = await checkDatabase(C.SID, 1);
      expect(subs[0]).to.shallowDeepEqual({
        sid: C.SID,
        plan_sku: C.SKUS.STANDARD,
        price: C.PLAN_PRICE.STANDARD,
        name: C.PLAN_NAMES.STANDARD,
        country_id: 840,
        currency_id: 840,
        s_status: 20,
      });

      await checkAudits(C.SID, 1);
    });

    it('should let you apply the current plan over an existing subscription to wipe away any changes to data or price but not touch sStatus', async () => {
      await MysqlMocker.query(`UPDATE ss_service SET price = 22.99, s_status = 0 WHERE sid = ${C.SID}`);
      let res = await request.post(`/v1/subscriptions/${C.SID}/apply/${C.SKUS.INTERACTIVE}`);

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          planSku: C.SKUS.INTERACTIVE,
          price: C.PLAN_PRICE.INTERACTIVE,
          planName: C.PLAN_NAMES.INTERACTIVE,
          country: 'US',
          currency: 'USD',
          sStatus: 0,
        },
      });

      let subs = await checkDatabase(C.SID, 1);
      expect(subs[0]).to.shallowDeepEqual({
        sid: C.SID,
        plan_sku: C.SKUS.INTERACTIVE,
        price: C.PLAN_PRICE.INTERACTIVE,
        name: C.PLAN_NAMES.INTERACTIVE,
        country_id: 840,
        currency_id: 840,
        s_status: 0,
      });

      await checkAudits(C.SID, 1);
    });

    it('should not let you downgrade a plan from interactive to camera only', async () => {
      // NOTE: I think we want to reject this so that we keep subscriptions to a single "Class"
      //       We can upgrade FROM a camera subscription to a full fledged system but not down
      //       At some point in the future we may need to support this but for safety falcon can reject it now.
      let res = await request.post(`/v1/subscriptions/${C.SID}/apply/${C.SKUS.CAMERA_ONLY}`);

      checkResult(res, 400, {
        type: 'InvalidParameter',
      });
    });

    it('should allow you to go from one camera plan to another', async () => {
      await MysqlMocker.clearTable('ss_service');
      await MysqlMocker.insert('ss_service', build.cameraUnlimitedSubscription());

      let res = await request.post(`/v1/subscriptions/${C.SID}/apply/${C.SKUS.CAMERA_ONLY}`);

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          price: C.PLAN_PRICE.CAMERA_ONLY,
          planName: C.PLAN_NAMES.CAMERA_ONLY,
          planSku: C.SKUS.CAMERA_ONLY,
          sStatus: 7,
          data: C.DATA.CAMERA_ONLY,
        },
      });

      let subs = await checkDatabase(C.SID, 1);
      expect(subs[0]).to.shallowDeepEqual({
        sid: C.SID,
        plan_sku: C.SKUS.CAMERA_ONLY,
        price: C.PLAN_PRICE.CAMERA_ONLY,
        name: C.PLAN_NAMES.CAMERA_ONLY,
        country_id: 840,
        currency_id: 840,
        s_status: 7,
      });

      await checkAudits(C.SID, 1);
    });

    it('should reject a request to update a subscription to a plan for another country', async () => {
      let res = await request.post(`/v1/subscriptions/${C.SID}/apply/${C.SKUS.BASIC_GB}`);

      checkResult(res, 400, {
        type: 'InvalidParameter',
      });

      let subs = await checkDatabase(C.SID, 1);
      expect(subs[0]).to.shallowDeepEqual({
        sid: C.SID,
        plan_sku: C.SKUS.INTERACTIVE,
        price: C.PLAN_PRICE.INTERACTIVE,
        name: C.PLAN_NAMES.INTERACTIVE,
        country_id: 840,
        currency_id: 840,
        s_status: 20,
      });

      await checkAudits(C.SID, 0);
    });

    it('should let you upgrade a standard UK service to Interactive', async () => {
      await MysqlMocker.clearTable('ss_service');
      await MysqlMocker.insert('ss_service', build.basicSubscriptionGB());

      let res = await request.post(`/v1/subscriptions/${C.SID}/apply/${C.SKUS.INTERACTIVE_GB}`);

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          price: C.PLAN_PRICE.INTERACTIVE_GB,
          planName: C.PLAN_NAMES.INTERACTIVE_GB,
          planSku: C.SKUS.INTERACTIVE_GB,
          sStatus: 20,
          data: C.DATA.INTERACTIVE_GB,
          country: 'GB',
          currency: 'GBP',
        },
      });

      let subs = await checkDatabase(C.SID, 1);
      expect(subs[0]).to.shallowDeepEqual({
        sid: C.SID,
        plan_sku: C.SKUS.INTERACTIVE_GB,
        price: C.PLAN_PRICE.INTERACTIVE_GB,
        name: C.PLAN_NAMES.INTERACTIVE_GB,
        data: C.DATA.INTERACTIVE_GB,
        country_id: 826,
        currency_id: 826,
        s_status: 20,
      });

      await checkAudits(C.SID, 1);
    });

    it('should reject trying to downgrade a UK basic service to camera only', async () => {
      await MysqlMocker.clearTable('ss_service');
      await MysqlMocker.insert('ss_service', build.basicSubscriptionGB());

      let res = await request.post(`/v1/subscriptions/${C.SID}/apply/${C.SKUS.CAMERA_UNLIMITED_GB}`);

      checkResult(res, 400, {
        type: 'InvalidParameter',
      });
    });

    it('should let you upgrade a blank location to camera unlimited', async () => {
      await MysqlMocker.clearTable('ss_service');
      await MysqlMocker.insert('ss_service', build.blankSubscription());

      let res = await request.post(`/v1/subscriptions/${C.SID}/apply/${C.SKUS.CAMERA_UNLIMITED}`);

      checkResult(res, 200, {
        subscription: {
          sid: C.SID,
          planSku: C.SKUS.CAMERA_UNLIMITED,
          planName: C.PLAN_NAMES.CAMERA_UNLIMITED,
          price: C.PLAN_PRICE.CAMERA_UNLIMITED,
          time: ONE_MONTH_IN_SECONDS,
          features: {
            cameras: 10,
          },
          sStatus: 7,
        },
      });

      let subs = await checkDatabase(C.SID, 1);
      expect(subs[0]).to.shallowDeepEqual({
        sid: C.SID,
        plan_sku: C.SKUS.CAMERA_UNLIMITED,
        price: C.PLAN_PRICE.CAMERA_UNLIMITED,
        name: C.PLAN_NAMES.CAMERA_UNLIMITED,
        data: C.DATA.CAMERA_UNLIMITED,
        s_status: 7,
      });

      await checkAudits(C.SID, 1);
    });
  });
});

async function checkDatabase(sid, num = 1) {
  let subs = await MysqlMocker.findAll(`SELECT * FROM ss_service WHERE sid = ${sid}`);
  expect(subs).to.have.lengthOf(num);

  return subs;
}

async function checkAudits(sid = C.SID, numAudits) {
  let audits = await MysqlMocker.findAll(`SELECT * FROM ss_service_AUDIT WHERE sid = ${sid}`);
  expect(audits).to.have.lengthOf(numAudits);

  return audits;
}
