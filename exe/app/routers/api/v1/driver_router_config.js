/**
 * driver_router_config.js - 驱动管理路由配置
 *
 * 定义驱动管理相关 RESTful 接口路由及其处理器。
 * 路由路径以 HTTP 方法为外层 key，内部 key 为路径，value 为 Express 中间件数组。
 * 由 route_loader 动态注册到 Express Router。
 */

const { driver } = require('../../../controllers');

module.exports = {
  get: {
    '/drivers': [driver.getDrivers],
    '/driverProperty': [driver.getDriverProperty],
    '/getPointMappingFiles': [driver.getPointMappingFiles],
  },
  post: {
    '/drivers': [driver.installDriver],
    '/uploadPointMappingFile': [driver.uploadPointMapping],
  },
  delete: {
    '/drivers': [driver.uninstallDriver],
    '/delPointMappingFile': [driver.delPointMapping],
  },
};
