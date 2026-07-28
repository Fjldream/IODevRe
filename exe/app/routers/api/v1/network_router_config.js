/**
 * network_router_config.js - 网络/存储/转发路由配置
 *
 * 定义网络配置、存储配置、转发配置相关 RESTful 接口路由及其处理器。
 */

const { network } = require('../../../controllers');

module.exports = {
  get: {
    '/networkProperty': [network.getNetworkProperty],
    '/storageList': [network.getStorageList],
    '/storageConfigById': [network.getStorageById],
    '/getDBAPPpropety': [network.getDBProperty],
    '/transTypes': [network.getTransTypes],
    '/transDBConfig': [network.getTransDBConfig],
    '/transConfigById': [network.getTransById],
  },
  post: {
    '/networkProperty': [network.addNetworkConfig],
    '/storageConfig': [network.addStorageConfig],
    '/addTransConfig': [network.addTransConfig],
    '/updateTransConfig': [network.updateTransConfig],
  },
  put: {
    '/storageConfig': [network.editStorageConfig],
  },
  delete: {
    '/storageConfig': [network.deleteStorageConfig],
    '/transConfig': [network.deleteTransConfig],
  },
};
