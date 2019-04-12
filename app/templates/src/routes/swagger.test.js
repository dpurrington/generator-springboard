const request = require('supertest');
const appModule = require('../app');

let app;

describe('swagger', () => {
  beforeAll(async () => {
    app = await appModule.startup();
  });

  it('/v1/swagger', async () => {
    const response = await request(app.callback()).get('/v1/swagger');
    expect(response.status).toBe(200);
    expect(response.body).toMatchSnapshot();
  });
});
