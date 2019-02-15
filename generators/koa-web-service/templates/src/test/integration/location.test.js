require('./bootstrap');

const conf = require('../../conf');
const _ = require('lodash');
const chai = require('chai');
const moment = require('moment');
const supertest = require('supertest');
const debug = require('debug')('falcon:test:subscription');

const request = supertest(`http://localhost:${_.get(conf, 'server.port')}`);
const expect = chai.expect;

const { MysqlMocker, utils, ServiceMocker } = require('@simplisafe/ss_test_utils');
const { checkResult } = utils;
const { C, build } = MysqlMocker;

chai.use(require('chai-shallow-deep-equal'));

describe('Location APIs', () => {
  describe('PUT /locations/:sid', () => {
    beforeEach(async () => {
      await MysqlMocker.insert('ss_location', build.location());
    });

    afterEach(async () => {
      await MysqlMocker.clearTable('ss_location');
      await MysqlMocker.clearTable('ss_location_AUDIT');
    });

    it('should let you update user fields on a location', async () => {
      let updates = {
        primaryContacts: [{
          name: 'Jane Jameson',
          phone: '1231231234',
        }, {
          name: 'Jon Jameson',
          phone: '1231231235',
        }],
        name: 'Mi Casa',
        videoVerification: false,
      };

      let res = await request.put(`/v1/locations/${C.SID}`).set('X-UID', 500).send(updates);

      checkResult(res, 200, {
        location: {
          sid: C.SID,
          name: updates.name,
          primaryContacts: [updates.primaryContacts[0], updates.primaryContacts[1]],
          videoVerification: false,
        },
      });

      let dbLoc = await MysqlMocker.findOne(`SELECT * FROM ss_location WHERE sid = ${C.SID}`);
      expect(dbLoc).to.shallowDeepEqual({
        location_name: updates.name,
        first_name: _.get(updates, 'primaryContacts[0].name', '').split(' ')[0],
        last_name: _.get(updates, 'primaryContacts[0].name', '').split(' ')[1],
        phone: _.get(updates, 'primaryContacts[0].phone', ''),
        first_name2: _.get(updates, 'primaryContacts[1].name', '').split(' ')[0],
        last_name2: _.get(updates, 'primaryContacts[1].name', '').split(' ')[1],
        phone2: _.get(updates, 'primaryContacts[1].phone', ''),
        enable_cops_video: 0,
      });

      let audits = await checkAudits(C.SID, 1);

      expect(audits[0]).to.shallowDeepEqual({
        edit_uid: 500,
        location_name: updates.name,
      });
    });

    it('should let you only set videoVerification', async () => {
      let updates = {
        videoVerification: true,
      };

      let res = await request.put(`/v1/locations/${C.SID}`).send(updates);

      checkResult(res, 200, {
        location: {
          sid: C.SID,
          name: 'TEST',
          videoVerification: true,
        },
      });

      let dbLoc = await MysqlMocker.findOne(`SELECT * FROM ss_location WHERE sid = ${C.SID}`);
      expect(dbLoc).to.shallowDeepEqual({
        enable_cops_video: 1,
      });

      await checkAudits(C.SID, 1);
    });

    it('should skip contacts if primary contacts is empty and not explicitly cleared', async () => {
      let updates = {
        name: 'My House',
        primaryContacts: [],
      };

      let res = await request.put(`/v1/locations/${C.SID}`).send(updates);

      checkResult(res, 200, {
        location: {
          sid: C.SID,
          name: 'My House',
          primaryContacts: [
            { name: 'test mctesterson', phone: '4221121122' },
          ],
        },
      });

      let dbLoc = await MysqlMocker.findOne(`SELECT * FROM ss_location WHERE sid = ${C.SID}`);
      expect(dbLoc).to.shallowDeepEqual({
        first_name: 'test',
        last_name: 'mctesterson',
      });

      await checkAudits(C.SID, 1);
    });

    it('should reject if you dont pass in a location object to update', async () => {
      let res = await request.put(`/v1/locations/${C.SID}`).send();

      checkResult(res, 400, {
        type: 'BadRequestError',
      });
    });

    it('should reject if a param is of the wrong type', async () => {
      let res = await request.put(`/v1/locations/${C.SID}`).send({ videoVerification: 'BUBBLES' });

      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });

    it('should reject if a param is sent that isnt in the validation list', async () => {
      let res = await request.put(`/v1/locations/${C.SID}`).send({ subscription: 5000 });

      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });

    it('should reject if primary contact name doesnt have a space', async () => {
      let res = await request.put(`/v1/locations/${C.SID}`).send({ primaryContacts: [{ name: 'Joe' }] });

      checkResult(res, 400, {
        type: 'ValidationError',
      });
    });
  });
});

async function checkAudits(sid = C.SID, numAudits) {
  let audits = await MysqlMocker.findAll(`SELECT * FROM ss_location_AUDIT WHERE sid = ${sid}`);
  expect(audits).to.have.lengthOf(numAudits);

  return audits;
}
