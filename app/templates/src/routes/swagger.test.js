const request = require('supertest');
const appModule = require('../app');

let app;
describe('swagger', () => {
  beforeAll(() => {
    app = appModule.listen();
  })
  afterAll(() => {
    app.close();
  })
  it('/v1/swagger', async () => {
    const response = await request(app).get('/v1/swagger');
    expect(response.status).toBe(200);
    expect(response.body).toMatchSnapshot();
  });
});
