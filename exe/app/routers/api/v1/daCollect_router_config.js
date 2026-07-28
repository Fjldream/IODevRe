/**
 * daCollect_router_config.js - DA 采集路由配置
 *
 * 定义 DA 采集相关 RESTful 接口路由及其处理器。
 */

const { dacollect } = require('../../../controllers');

module.exports = {
  get: {
    '/daDeviceGroups': [dacollect.getDADeviceGroups],
    '/daDevices': [dacollect.getDADevices],
    '/daVars': [dacollect.getDAVars],
    '/daTestConnect': [dacollect.testConnect],
    '/daRootSources': [dacollect.browseRootSources],
    '/daChildSources': [dacollect.browseChildSources],
  },
  post: {
    '/daDeviceGroups': [dacollect.addDADeviceGroup],
    '/daDevices': [dacollect.addDADevice],
    '/daVars': [dacollect.addDAVars],
    '/daExportVars': [dacollect.exportDAVars],
    '/daImportVars': [dacollect.importDAVars],
  },
  put: {
    '/daDeviceGroups': [dacollect.editDADeviceGroup],
    '/daDevices': [dacollect.editDADevice],
    '/daVars': [dacollect.editDAVars],
  },
  delete: {
    '/daDeviceGroups': [dacollect.deleteDADeviceGroups],
    '/daDevices': [dacollect.deleteDADevices],
    '/daVars': [dacollect.deleteDAVars],
  },
};
