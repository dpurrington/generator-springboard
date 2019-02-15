require('./bootstrap');

const conf = require('../../conf');
const _ = require('lodash');
const moment = require('moment');
const debug = require('debug')('falcon:test:models');
const Joi = require('koa-joi-router').Joi;

const SSError = require('@simplisafe/ss_error').SSError;
const { unserialize } = require('@simplisafe/ss_mysql');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
chai.use(require('chai-shallow-deep-equal'));


const { MysqlMocker } = require('@simplisafe/ss_test_utils');

const { C, build } = MysqlMocker;

// Formatters
const LocationFormatter = require('../../models/formatters/LocationFormatter');
const SubscriptionFormatter = require('../../models/formatters/SubscriptionFormatter');

// Models
const Plan = require('../../models/Plan');
const Location = require('../../models/Location');
const Subscription = require('../../models/Subscription');
const CameraSubscription = require('../../models/CameraSubscription');

describe('Model Unit/Integration Tests', () => {
  describe('Location', () => {
    let location, subscription;

    beforeEach(async () => {
      location = build.location();
      subscription = build.subscription();

      await MysqlMocker.insert('ss_location', location);
      await MysqlMocker.insert('ss_service', subscription);
    });

    afterEach(async () => {
      await MysqlMocker.clearTable('ss_location');
      await MysqlMocker.clearTable('ss_service');
    });

    it('should return a location by sid', async () => {
      let loc = await Location.bySid(C.SID);
      expect(loc.__location).to.shallowDeepEqual(location);

      expect(loc.toClient()).to.shallowDeepEqual(LocationFormatter.toClient(loc.__location));
    });

    it('should return true if a location is a camera only location', async () => {
      await MysqlMocker.query(`UPDATE ss_location SET account = 'X${C.SID}' WHERE sid = ${C.SID}`);
      let loc = await Location.bySid(C.SID);
      expect(loc.isCameraAccount()).to.equal(true);
    });

    it('should return false if a camera is not a camera only location', async () => {
      let loc = await Location.bySid(C.SID);
      expect(loc.isCameraAccount()).to.equal(false);
    });

    it('should return a location by account', async () => {
      let loc = await Location.byAccount(C.ACCOUNT_SS3);
      expect(loc.__location).to.shallowDeepEqual(location);

      expect(loc.toClient()).to.shallowDeepEqual(LocationFormatter.toClient(loc.__location));
    });

    it('should return a location without a first name and last name', async () => {
      await MysqlMocker.query(`UPDATE ss_location SET first_name = '', last_name = '', phone = '' WHERE sid = ${C.SID}`);

      let loc = await Location.byAccount(C.ACCOUNT_SS3);

      expect(loc.toClient()).to.shallowDeepEqual({
        primaryContacts: [
          { name: '', phone: '' },
          { name: '', phone: '' },
        ],
      });
    });

    it('should return the highest s_status location when searched for by account', async () => {
      await MysqlMocker.query(`UPDATE ss_service SET s_status = 5 WHERE sid = ${C.SID}`);
      let loc = await Location.byAccount(C.ACCOUNT_SS3);

      expect(loc.__location).to.shallowDeepEqual(location);
    });

    it('should throw a Not Found error if the sid doesnt exist', async () => {
      await expect(Location.bySid(C.SID + 10)).to.be.rejectedWith(SSError);
    });

    it('should throw a Not Found error if the account doesnt exist', async () => {
      await expect(Location.byAccount('01234567')).to.be.rejectedWith(SSError);
    });

    it('should throw an error if we try to call toClient when a location wasnt loaded', async () => {
      let loc = await Location.bySid(C.SID);

      loc.__location = null;

      expect(loc.toClient.bind(loc)).to.throw(SSError);
    });

    it('should throw an error if isCameraAccount is called when a location isnt loaded', async () => {
      let loc = await Location.bySid(C.SID);

      loc.__location = null;

      expect(loc.isCameraAccount.bind(loc)).to.throw(SSError);
    });

    it('should return a validOutput object', async () => {
      // Just check a few fields
      expect(Location.validOutput()).to.shallowDeepEqual({
        sid: Joi.number(),
        account: Joi.string().allow(''),
        street1: Joi.string().allow(''),
        street2: Joi.string().allow(''),
        crossStreet: Joi.string().allow(''),
        name: Joi.string().allow(''),
        city: Joi.string().allow(''),
        state: Joi.string().allow(''),
        zip: Joi.string().allow(''),
      });
    });

    it('should return a validInput object', () => {
      // Just check a few fields
      expect(Location.validInput()).to.shallowDeepEqual({
        sid: Joi.number(),
        uid: Joi.number(),
        account: Joi.string(),
        street1: Joi.string().allow(''),
        street2: Joi.string().allow(''),
        crossStreet: Joi.string().allow(''),
        name: Joi.string().allow(''),
        city: Joi.string().allow(''),
        state: Joi.string().allow(''),
      });
    });
  });

  describe('Subscription', () => {
    let location, subscription;

    beforeEach(async () => {
      location = build.location();
      subscription = build.subscription();

      await MysqlMocker.insert('ss_location', location);
      await MysqlMocker.insert('ss_service', subscription);
    });

    afterEach(async () => {
      await MysqlMocker.clearTable('ss_service');
      await MysqlMocker.clearTable('ss_location');
      await MysqlMocker.clearTable('ss_service_AUDIT');
    });

    it('should return a subscription by sid', async () => {
      let sub = await Subscription.bySid(C.SID);
      expect(sub.__subscription).to.shallowDeepEqual(subscription);

      let data = unserialize(sub.__subscription.data);
      expect(sub.toClient()).to.shallowDeepEqual(SubscriptionFormatter.toClient(sub.__subscription, data));
    });

    it('should return a subscription by account', async () => {
      let sub = await Subscription.byAccount(C.ACCOUNT_SS3);
      expect(sub.__subscription).to.shallowDeepEqual(subscription);

      let data = unserialize(sub.__subscription.data);
      expect(sub.toClient()).to.shallowDeepEqual(SubscriptionFormatter.toClient(sub.__subscription, data));
    });

    it('should throw an error if the sid doesnt exist', async () => {
      await expect(Subscription.bySid(1234)).to.be.rejectedWith(SSError);
    });

    it('should throw an error if the account doesnt exist', async () => {
      await expect(Subscription.byAccount('00123400')).to.be.rejectedWith(SSError);
    });

    it('should throw an update if you try to update a subscription that wasnt loaded', async () => {
      let sub = await Subscription.bySid(C.SID);
      delete sub.__subscription;

      expect(sub.update(getCTX(), { currency: 'GBP' })).to.be.rejectedWith(SSError, 'Subscription was not loaded, cannot update subscription');
    });

    it('should default to edit_uid of zero if there isnt a user stored in the ctx', async () => {
      let sub = await Subscription.bySid(C.SID);

      await sub.update({}, { currency: 'GBP' });

      let audit = await MysqlMocker.findAll('SELECT * FROM ss_service_AUDIT');
      expect(audit).to.have.lengthOf(1);
      expect(audit[0].edit_uid).to.equal(0);
    });

    it('should not change the country or currency if those do not exist and fail silently', async () => {
      let sub = await Subscription.bySid(C.SID);

      await sub.update({}, { currency: 'ARK', country: 'XX' });

      let audit = await MysqlMocker.findAll('SELECT * FROM ss_service_AUDIT');
      expect(audit).to.have.lengthOf(1);

      let updated = await MysqlMocker.findOne(`SELECT * FROM ss_service WHERE sid = ${C.SID}`);
      expect(updated).to.shallowDeepEqual({
        country_id: 840,
        currency_id: 840,
      });
    });

    it('should throw an error if the data field is blank', async () => {
      await MysqlMocker.query(`UPDATE ss_service SET data = '' WHERE sid = ${C.SID}`);
      let sub = await Subscription.bySid(C.SID);

      expect(sub.update(getCTX(), { features: { monitoring: false } })).to.be.rejectedWith(SSError, 'No Data available on subscription');
    });

    it('should throw an error if toClient is called with no loaded subscription or if the data is bad', async () => {
      let sub = await Subscription.bySid(C.SID);
      sub.__subscription = null;

      await expect(sub.toClient.bind(sub)).to.throw(SSError);

      let sub2 = await Subscription.byAccount(C.ACCOUNT_SS3);
      sub2.__subscription.data = '';

      await expect(sub2.toClient.bind(sub2)).to.throw(SSError);
    });

    it('should throw an error if save is called with no loaded subscription', async () => {
      let sub = await Subscription.bySid(C.SID);
      sub.__subscription = null;

      await expect(sub.save()).to.eventually.be.rejectedWith(SSError);
    });

    it('should throw an error if applyPlan is called with no loaded subscription', async () => {
      let sub = await Subscription.bySid(C.SID);
      sub.__subscription = null;

      await expect(sub.applyPlan(getCTX(), {})).to.eventually.be.rejectedWith(SSError);
    });

    it('should throw an error if you try to save and no sid is tied to the subscription', async () => {
      let sub = await Subscription.bySid(C.SID);

      sub.__subscription.sid = null;
      await expect(sub.save(getCTX())).to.eventually.be.rejectedWith(SSError);
    });

    it('should return a validOutput object', async () => {
      // Just check a few fields
      expect(Subscription.validOutput()).to.shallowDeepEqual({
        uid: Joi.number(),
        sid: Joi.number(),
        orderId: Joi.number(),
        orderProductId: Joi.number(),
        sStatus: Joi.number(),
        planSku: Joi.string(),
        planName: Joi.string(),
        currency: Joi.string(),
        country: Joi.string().alphanum().length(2),
      });
    });

    it('should return a validInput object', () => {
      // Just check a few fields
      expect(Subscription.validInput()).to.shallowDeepEqual({
        uid: Joi.number(),
        sid: Joi.number(),
        orderId: Joi.number(),
        orderProductId: Joi.number(),
        planSku: Joi.string(),
        planName: Joi.string(),
        currency: Joi.string(),
        country: Joi.string().alphanum().length(2),
      });
    });

    it('should return a validCreateInput object', () => {
      expect(Subscription.validCreateInput()).to.shallowDeepEqual({
        uid: Joi.number().default(-1),
        orderId: Joi.number().default(0),
        orderProductId: Joi.number().default(0),
        activationCode: Joi.string().default(''),
        creditCard: {
          ppid: Joi.number(),
          backupPpid: Joi.number().allow(null),
          uid: Joi.number(),
        },
      });
    });
  });

  describe('Plans', () => {
    it('should return plans based on country', async () => {
      let plans = await Plan.byCountry('US');

      let result = _.map(plans, plan => plan.toClient());
      // US just returns all the legacy plans
      expect(result).to.have.lengthOf(15);

      // Check a few of the plans
      let interactive = _.find(result, { planSku: C.SKUS.INTERACTIVE });
      expect(interactive).to.shallowDeepEqual({
        name: C.PLAN_NAMES.INTERACTIVE,
        price: C.PLAN_PRICE.INTERACTIVE,
        features: {
          monitoring: true,
          online: true,
          alerts: true,
          cameras: 10,
        },
      });
    });

    it('should return UK plans', async () => {
      let plans = await Plan.byCountry('GB');

      let result = _.sortBy(_.map(plans, plan => plan.toClient()), 'price');
      expect(result).to.have.lengthOf(5);

      let check = _.map(['BLANK_GB', 'CAMERA_UNLIMITED_GB', 'BASIC_GB', 'BASIC_PLUS_CAM_GB', 'INTERACTIVE_GB'], (name) => {
        return {
          planSku: _.get(C, `SKUS.${name}`),
          name: _.get(C, `PLAN_NAMES.${name}`),
          price: _.get(C, `PLAN_PRICE.${name}`),
          country: 'GB',
          currency: 'GBP',
        };
      });

      expect(result).to.shallowDeepEqual(check);
    });

    it('should throw a NotFound error for an invalid sku', async () => {
      await expect(Plan.bySku('SFDSFSDFSDFD')).to.be.rejectedWith(SSError);
    });

    it('should throw an error if toClient is called and the plans were removed', async () => {
      let plans = await Plan.byCountry('US');

      for (let plan of plans) {
        plan.__plan = null;

        expect(plan.toClient.bind(plan)).to.throw(SSError, 'Tried to call toClient when no plan was loaded');
      }
    });

    it('should throw an error if toInternal is called and the plans were removed', async () => {
      let plans = await Plan.byCountry('US');

      for (let plan of plans) {
        plan.__plan = null;

        expect(plan.toInternal.bind(plan)).to.throw(SSError, 'Tried to call toInternal when no plan was loaded');
      }
    });

    it('should return a valid output object', async () => {
      expect(Plan.validOutput()).to.shallowDeepEqual({
        planSku: Joi.string().required(),
        time: Joi.number(),
        renew: Joi.number(),
        name: Joi.string(),
        price: Joi.number(),
        description: Joi.string(),
        features: {
          monitoring: Joi.boolean(),
          alerts: Joi.boolean(),
          online: Joi.boolean(),
          hazard: Joi.boolean(),
          video: Joi.boolean(),
          cameras: Joi.number(),
        },
        systemVersion: Joi.number(),
        currency: Joi.string().length(3),
        country: Joi.string().length(2),
      });
    });
  });

  describe('CameraSubscription', () => {
    beforeEach(async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService());
    });

    afterEach(async () => {
      await MysqlMocker.clearTable('ss_camera_service');
      await MysqlMocker.clearTable('ss_camera_service_AUDIT');
    });

    it('should get camera service by uuid and sid', async () => {
      let service = await CameraSubscription.bySidUuid(C.SID, C.UUID);
      expect(service.toClient()).to.shallowDeepEqual({
        sid: C.SID,
        uid: C.UID,
        uuid: C.UUID,
        planSku: 'SSVM1',
        price: 0,
      });
    });

    it('should get a list of subscriptions by uid', async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService({ csid: 2, uuid: C.UUID2 }));

      let subs = await CameraSubscription.byUid(C.UID);
      expect(subs).to.have.lengthOf(2);
      expect(_(subs).map(sub => sub.toClient()).sortBy('uuid').value()).to.shallowDeepEqual([
        {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID,
          planSku: 'SSVM1',
          price: 0,
        },
        {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID2,
          planSku: 'SSVM1',
          price: 0,
        },
      ]);
    });

    it('should get a list of subscriptions by sid', async () => {
      await MysqlMocker.insert('ss_camera_service', build.cameraService({ csid: 2, uuid: C.UUID2 }));

      let subs = await CameraSubscription.bySid(C.SID);
      expect(subs).to.have.lengthOf(2);
      expect(_(subs).map(sub => sub.toClient()).sortBy('uuid').value()).to.shallowDeepEqual([
        {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID,
          planSku: 'SSVM1',
          price: 0,
        },
        {
          sid: C.SID,
          uid: C.UID,
          uuid: C.UUID2,
          planSku: 'SSVM1',
          price: 0,
        },
      ]);
    });

    it('should return a blank array for byUid and bySid if none exist', async () => {
      expect(await CameraSubscription.bySid(1010)).to.have.lengthOf(0);
      expect(await CameraSubscription.byUid(1010)).to.have.lengthOf(0);
    });

    it('should let you create a new camera subscription with just sid and uid and default proper fields', async () => {
      const service = await CameraSubscription.create(C.UUID2, {
        sid: C.SID,
        uid: C.UID,
      });

      const clientService = service.toClient();
      expect(clientService).to.shallowDeepEqual({
        uuid: C.UUID2,
        sid: C.SID,
        uid: C.UID,
        recordingLifetime: C.ONE_MONTH_IN_SECONDS,
        planSku: 'SSVM1',
        canceled: 0,
        time: C.ONE_MONTH_IN_SECONDS,
        trialUsed: false,
      });

      expect(clientService.created).to.be.gte(moment().subtract(1, 'minute').unix());
      expect(clientService.expires).to.be.gte(moment().add(1, 'week').unix());

      const serviceRow = await MysqlMocker.findOne(`SELECT * FROM ss_camera_service WHERE uuid = '${C.UUID2}' AND sid = ${C.SID}`);
      expect(serviceRow).to.shallowDeepEqual({
        uid: C.UID,
        sid: C.SID,
        uuid: C.UUID2,
        recording_lifetime: C.ONE_MONTH_IN_SECONDS,
        plan_sku: 'SSVM1',
        canceled: 0,
        time: C.ONE_MONTH_IN_SECONDS,
        trial_used: 0,
      });

      expect(serviceRow.expires).to.be.gte(moment().add(1, 'week').unix());
    });

    it('should not overwrite fields with defaults', async () => {
      const service = await CameraSubscription.create(C.UUID2, {
        sid: C.SID,
        uid: C.UID,
        recordingLifetime: 50000,
        trialUsed: true,
      });

      const clientService = service.toClient();
      expect(clientService).to.shallowDeepEqual({
        uuid: C.UUID2,
        sid: C.SID,
        uid: C.UID,
        recordingLifetime: 50000,
        planSku: 'SSVM1',
        canceled: 0,
        time: C.ONE_MONTH_IN_SECONDS,
        trialUsed: true,
      });

      expect(clientService.created).to.be.gte(moment().subtract(1, 'minute').unix());
      expect(clientService.expires).to.be.gte(moment().add(1, 'week').unix());

      const serviceRow = await MysqlMocker.findOne(`SELECT * FROM ss_camera_service WHERE uuid = '${C.UUID2}' AND sid = ${C.SID}`);
      expect(serviceRow).to.shallowDeepEqual({
        uid: C.UID,
        sid: C.SID,
        uuid: C.UUID2,
        recording_lifetime: 50000,
        plan_sku: 'SSVM1',
        canceled: 0,
        time: C.ONE_MONTH_IN_SECONDS,
        trial_used: 1,
      });

      expect(serviceRow.expires).to.be.gte(moment().add(1, 'week').unix());
    });

    it('should let you update expires but not canceled', async () => {
      const t = await moment().add(2, 'days').unix();
      const service = await CameraSubscription.create(C.UUID2, {
        sid: C.SID,
        uid: C.UID,
        expires: t,
        canceled: t,
        trialUsed: false,
      });

      expect(service.toClient()).to.shallowDeepEqual({
        uuid: C.UUID2,
        sid: C.SID,
        uid: C.UID,
        expires: t,
        canceled: 0,
        trialUsed: false,
      });

      expect(service.toClient().created).to.be.gte(moment().subtract(1, 'minute').unix());

      const serviceRow = await MysqlMocker.findOne(`SELECT * FROM ss_camera_service WHERE uuid = '${C.UUID2}' AND sid = ${C.SID}`);
      expect(serviceRow).to.shallowDeepEqual({
        uid: C.UID,
        sid: C.SID,
        uuid: C.UUID2,
        expires: t,
        canceled: 0,
        trial_used: 0,
      });
    });

    it('should throw an error if you try to update a camera subscription when not loaded', async () => {
      let service = await CameraSubscription.bySidUuid(C.SID, C.UUID);
      delete service.__subscription;

      await expect(service.update(getCTX(), {})).to.eventually.be.rejectedWith(SSError);
    });

    it('should throw an error if you try to create a uuid and sid combo that already exists', async () => {
      await expect(CameraSubscription.create(C.UUID, { sid: C.SID, uid: C.UID })).to.eventually.be.rejectedWith(SSError);
    });

    it('should throw an error if toClient is called when the sub isnt loaded yet', async () => {
      let service = await CameraSubscription.bySidUuid(C.SID, C.UUID);
      delete service.__subscription;

      expect(service.toClient.bind(service)).to.throw(SSError);
    });

    it('should not save if a uuid or sid are not present and throw an error', async () => {
      let service = await CameraSubscription.bySidUuid(C.SID, C.UUID);
      service.__subscription.sid = null;

      await expect(service.save(getCTX())).to.eventually.be.rejectedWith(SSError);

      service = await CameraSubscription.bySidUuid(C.SID, C.UUID);
      service.__subscription.uuid = null;

      await expect(service.save(getCTX())).to.eventually.be.rejectedWith(SSError);
    });

    it('should cancel a subscription', async () => {
      let service = await CameraSubscription.bySidUuid(C.SID, C.UUID);
      await service.cancel(getCTX());

      expect(service.toClient()).to.have.property('canceled').gte(moment().subtract(1, 'minute').unix());
      expect(service.toClient()).to.have.property('expires').equal(0);

      const dbRow = await MysqlMocker.findOne(`SELECT * FROM ss_camera_service WHERE sid = ${C.SID} AND uuid = '${C.UUID}'`);
      expect(dbRow).to.have.property('expires').equal(0);
      expect(dbRow).to.have.property('canceled').gte(moment().subtract(1, 'minute').unix());

      const auditRows = await MysqlMocker.findAll(`SELECT * FROM ss_camera_service_AUDIT WHERE sid = ${C.SID}`);
      expect(auditRows).to.have.lengthOf(1);
      expect(auditRows[0]).to.shallowDeepEqual({
        expires: 0,
        edit_uid: 12345,
      });
      expect(auditRows[0]).to.have.property('edit_timestamp').gte(moment().subtract(1, 'minute').unix());
      expect(auditRows[0]).to.have.property('canceled').gte(moment().subtract(1, 'minute').unix());
    });

    it('should activate a subscription', async () => {
      let service = await CameraSubscription.bySidUuid(C.SID, C.UUID);
      await service.activate();

      expect(service.toClient()).to.have.property('expires').gte(moment().add(1, 'day').unix());
      expect(service.toClient()).to.have.property('canceled').equal(0);

      const dbRow = await MysqlMocker.findOne(`SELECT * FROM ss_camera_service WHERE sid = ${C.SID} AND uuid = '${C.UUID}'`);
      expect(dbRow).to.have.property('canceled').equal(0);
      expect(dbRow).to.have.property('expires').gte(moment().add(1, 'day').unix());

      const auditRows = await MysqlMocker.findAll(`SELECT * FROM ss_camera_service_AUDIT WHERE sid = ${C.SID}`);
      expect(auditRows).to.have.lengthOf(1);
      expect(auditRows[0]).to.shallowDeepEqual({
        canceled: 0,
        edit_uid: 0,
      });
      expect(auditRows[0]).to.have.property('edit_timestamp').gte(moment().subtract(1, 'minute').unix());
      expect(auditRows[0]).to.have.property('expires').gte(moment().add(1, 'day').unix());
    });

    it('should throw an error if cancel, activate or save is called when the subscription isnt loaded', async () => {
      let service = await CameraSubscription.bySidUuid(C.SID, C.UUID);
      service.__subscription = null;

      await expect(service.cancel(getCTX)).to.eventually.be.rejectedWith(SSError);
      await expect(service.activate(getCTX)).to.eventually.be.rejectedWith(SSError);
      await expect(service.save(getCTX)).to.eventually.be.rejectedWith(SSError);
    });

    it('should return a correct valid input', async () => {
      expect(CameraSubscription.validInput()).to.shallowDeepEqual({
        sid: Joi.number().required(),
        uid: Joi.number().required(),
        recordingLifetime: Joi.number(),
        planSku: Joi.string(),
        price: Joi.number(),
        expires: Joi.number(),
        time: Joi.number(),
        extraTime: Joi.number(),
        trialUsed: Joi.boolean(),
      });
    });

    it('should return a correct valid output', async () => {
      expect(CameraSubscription.validOutput()).to.shallowDeepEqual({
        uid: Joi.number(),
        sid: Joi.number(),
        uuid: Joi.string(),
        recordingLifetime: Joi.number(),
        planSku: Joi.string(),
        price: Joi.number(),
        created: Joi.number(),
        expires: Joi.number(),
        canceled: Joi.number(),
        time: Joi.number(),
        extraTime: Joi.number(),
        trialUsed: Joi.boolean(),
      });
    });
  });
});

function getCTX(uid = 12345) {
  return {
    state: { user: uid },
    log: console,
  };
}
