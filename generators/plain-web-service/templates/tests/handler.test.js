const handler = require('../app/handler');

describe('integration', () => {
<% if (serviceType === 'web service') { -%>
  const thingId = 1234;
  describe('Get thing by id', () => {
    test('correct object is returned', async () => {
      const thing = await handler.getThing({ pathParameters: { id: thingId } });
      const body = JSON.parse(thing.body);
      expect(body.thing).toBeDefined();
    });
  });
<% } -%>
<% if (serviceType === 'scheduled task') { -%>
  describe('do the thing', () => {
    test('does the right stuff', async () => {
      await handler.doThing();
    });
  });
<% } -%>
});
