const _ = require('lodash');

const featuresFromData = (data) => {
  return {
    monitoring: Boolean(_.get(data, 'features.monitoring.enable', 0)),
    alerts: Boolean(_.get(data, 'features.alerts.enable', 0)),
    online: Boolean(_.get(data, 'features.online.enable', 0)),
    hazard: Boolean(_.get(data, 'features.hazard.enable', 0)),
    video: Boolean(_.get(data, 'features.video.enable', 0)),
    cameras: _.get(data, 'features.cameras.value', 0),
  };
};

const dataFromFeatures = (features) => {
  let data = {};

  for (let feature of ['monitoring', 'alerts', 'online', 'hazard', 'video']) {
    if (!_.isNil(_.get(features, feature))) {
      _.set(data, `features.${feature}.enable`, _.toInteger(_.get(features, feature)));
    }
  }

  if (!_.isNil(_.get(features, 'cameras'))) {
    let numCams = _.get(features, 'cameras');
    _.set(data, 'features.cameras.enable', numCams > 0 ? 1 : 0);
    _.set(data, 'features.cameras.value', numCams);
  }

  return data;
};

module.exports = {
  featuresFromData,
  dataFromFeatures,
};
