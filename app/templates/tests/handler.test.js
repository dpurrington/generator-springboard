const {
  getThing,
} = require('../app/handler');

describe('integration', () => {
  const thingId = 1234;

  describe('Get thing by id', () => {
    test('correct object is returned', async () => {
      const thing = await getThing({ pathParameters: { id: thingId } });
      const body = JSON.parse(thing.body);
      expect(body.thing).toBeDefined();
    });
  });
});
