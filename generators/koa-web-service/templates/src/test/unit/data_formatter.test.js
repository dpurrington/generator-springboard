const { featuresFromData, dataFromFeatures } = require('../../models/formatters/DataFormatter');
const chai = require('chai');

chai.use(require('chai-shallow-deep-equal'));

const expect = chai.expect;

describe('DataFormatter Unit Tests', () => {
  it('should format data from features list', async () => {
    const data = dataFromFeatures({ monitoring: true, alerts: false, cameras: 0 });
    expect(data).to.shallowDeepEqual({
      features: {
        monitoring: { enable: 1 },
        alerts: { enable: 0 },
        cameras: { enable: 0, value: 0 },
      },
    });
  });

  it('should format data from features list with everything', async () => {
    const data = dataFromFeatures({ monitoring: true, alerts: false, video: false, online: true, hazard: false, cameras: 0 });
    expect(data).to.shallowDeepEqual({
      features: {
        monitoring: { enable: 1 },
        alerts: { enable: 0 },
        video: { enable: 0 },
        online: { enable: 1 },
        hazard: { enable: 0 },
        cameras: { enable: 0, value: 0 },
      },
    });
  });

  it('should return features from an unserialized data object', async () => {
    const features = featuresFromData({
      features: {
        monitoring: { enable: 1 },
        alerts: { enable: 0 },
        video: { enable: 0 },
        online: { enable: 1 },
        hazard: { enable: 0 },
        cameras: { enable: 0, value: 10 },
      },
    });

    expect(features).to.shallowDeepEqual({
      monitoring: true,
      alerts: false,
      video: false,
      online: true,
      hazard: false,
      cameras: 10,
    });
  });
});
