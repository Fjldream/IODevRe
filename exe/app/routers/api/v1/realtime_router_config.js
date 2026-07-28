const { realtime } = require('../../../controllers');
module.exports = {
  get: { '/batchRealValue': [realtime.batchRealValue], '/realtimeVarInfo': [realtime.realtimeVarInfo] },
  post: {}, put: {}, delete: {},
};
