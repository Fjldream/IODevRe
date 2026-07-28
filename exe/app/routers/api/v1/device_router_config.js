/**
 * device_router_config.js - 设备管理路由配置
 *
 * 定义设备组和设备相关 RESTful 接口路由及其处理器。
 * 路由路径以 HTTP 方法为外层 key，内部 key 为路径，value 为 Express 中间件数组。
 * 由 route_loader 动态注册到 Express Router。
 */

const { device } = require('../../../controllers');

module.exports = {
  get: {
    '/deviceGroups': [device.getDeviceGroupTree],
    '/devices': [device.getDevices],
    '/deviceProperty': [device.getDeviceProperty],
    '/registers': [device.getRegisters],
  },
  post: {
    '/deviceGroups': [device.createDeviceGroup],
    '/devices': [device.createDevice],
    '/moveDevice': [device.moveDevice],
    '/exportDevices': [device.exportDevices],
    '/importDevices': [device.importDevices],
  },
  put: {
    '/deviceGroups': [device.editDeviceGroup],
    '/devices': [device.editDevice],
  },
  delete: {
    '/deviceGroups': [device.deleteDeviceGroup],
    '/devices': [device.deleteDevice],
  },
};
