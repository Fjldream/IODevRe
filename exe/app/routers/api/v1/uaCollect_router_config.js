/**
 * uaCollect_router_config.js - UA 采集路由配置
 *
 * 定义 UA OPC UA 采集相关 RESTful 接口路由及其处理器。
 */

const { uacollect } = require('../../../controllers');

module.exports = {
  get: {
    '/uaDevices': [uacollect.getUADevices],
    '/uaRootSources': [uacollect.browseRootSources],
    '/uaChildSources': [uacollect.browseChildSources],
    '/uaVars': [uacollect.getUAVars],
  },
  post: {
    '/uaConnect': [uacollect.uaConnect],
    '/uaDevices': [uacollect.addUADevice],
    '/uaVars': [uacollect.addUAVars],
    '/uaExportVars': [uacollect.exportUAVars],
    '/uaImportVars': [uacollect.importUAVars],
  },
  put: {
    '/uaDevices': [uacollect.editUADevice],
    '/uaVars': [uacollect.editUAVars],
  },
  delete: {
    '/uaDevices': [uacollect.deleteUADevices],
    '/uaVars': [uacollect.deleteUAVars],
  },
};
