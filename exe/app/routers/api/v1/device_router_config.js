const { device } = require('../../../controllers');
module.exports = {
  get:    { '/deviceGroups': [device.getDeviceGroups], '/devices': [device.getDevices], '/deviceProperty': [device.getDeviceProperty] },
  post:   { '/deviceGroups': [device.createDeviceGroup], '/devices': [device.createDevice], '/moveDevice': [device.moveDevice], '/exportDevices': [device.exportDevices], '/importDevices': [device.importDevices] },
  put:    { '/deviceGroups': [device.editDeviceGroup], '/devices': [device.editDevice] },
  delete: { '/deviceGroups': [device.deleteDeviceGroup], '/devices': [device.deleteDevice] },
};
