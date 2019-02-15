require('./bootstrap');

const conf = require('../../conf');
const sdk = require('@simplisafe/ss_sdk');
const chai = require('chai');
const expect = chai.expect;
const SSError = require('@simplisafe/ss_error').SSError;

chai.use(require('chai-as-promised'));

const utils = require('../../lib/utils');
const { MysqlMocker } = require('@simplisafe/ss_test_utils');
const { build, C } = MysqlMocker;

describe('Util File', () => {
  describe('getBSVersion', () => {
    afterEach(async () => {
      await MysqlMocker.clearTable('ss_fulfill');
    });

    it('should return the existing version', async () => {
      await MysqlMocker.insert('ss_fulfill', build.fulfill({ version: 2 }));
      expect(await utils.getBSVersion(C.ACCOUNT_SS3)).to.equal(2);
    });

    it('should return the calculated version if a fulfill row doesnt exist', async () => {
      expect(await utils.getBSVersion(C.ACCOUNT_SS3)).to.equal(3);
      expect(await utils.getBSVersion(C.ACCOUNT_SS2)).to.equal(2);
      expect(await utils.getBSVersion('X1234567')).to.equal(0);
    });
  });

  describe('accountToSid', () => {
    afterEach(async () => {
      await MysqlMocker.clearTable('ss_location');
      await MysqlMocker.clearTable('ss_service');
    });

    it('should convert an account to the matching sid', async () => {
      await MysqlMocker.insert('ss_location', build.location({ account: '000000AA' }));
      await MysqlMocker.insert('ss_service', build.subscription());

      let sid = await utils.accountToSid('000000AA');
      expect(sid).to.equal(C.SID);
    });

    it('should only return an active subscription that matches this account', async () => {
      await MysqlMocker.insert('ss_location', build.location({ account: '000000AA' }));
      await MysqlMocker.insert('ss_location', build.location({ account: '000000AA', sid: C.SID + 1 }));
      await MysqlMocker.insert('ss_service', build.subscription({ s_status: 5 }));
      await MysqlMocker.insert('ss_service', build.subscription({ sid: C.SID + 1 }));

      let sid = await utils.accountToSid('000000AA');
      expect(sid).to.equal(C.SID + 1);
    });

    it('should return null if it doesnt exist', async () => {
      await MysqlMocker.insert('ss_location', build.location({ account: '000000AA' }));
      await MysqlMocker.insert('ss_service', build.subscription());

      let sid = await utils.accountToSid('000000BB');
      expect(sid).to.equal(null);
    });
  });

  describe('sidToAccount', () => {
    afterEach(async () => {
      await MysqlMocker.clearTable('ss_location');
      await MysqlMocker.clearTable('ss_service');
    });

    it('should find the account for a sid', async () => {
      await MysqlMocker.insert('ss_location', build.location({ account: '000000AA' }));
      await MysqlMocker.insert('ss_service', build.subscription());

      let account = await utils.sidToAccount(C.SID);
      expect(account).to.equal('000000AA');
    });

    it('should return null if the location doesnt exist', async () => {
      await MysqlMocker.insert('ss_location', build.location({ sid: 12345 }));
      await MysqlMocker.insert('ss_service', build.subscription());

      let account = await utils.sidToAccount(C.SID);
      expect(account).to.equal(null);
    });
  });
});
