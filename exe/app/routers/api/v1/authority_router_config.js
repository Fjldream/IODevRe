const { authority } = require('../../../controllers');
module.exports = {
  get: {},
  post: { '/validateToken': [authority.validateToken], '/checkPermission': [authority.checkPermission] },
  put: {}, delete: {},
};
