const { device } = require('../../../controllers');
module.exports = {
  get:    { '/deviceGroups': [device.getGroups], '/devices': [device.getDevices], '/deviceProperty': [device.getProperty] },
  post:   { '/deviceGroups': [device.createGroup], '/devices': [device.createDevice], '/moveDevice': [device.moveDevice], '/exportDevices': [device.exportDevices], '/importDevices': [device.importDevices] },
  put:    { '/deviceGroups': [device.editGroup], '/devices': [device.editDevice] },
  delete: { '/deviceGroups': [device.deleteGroup], '/devices': [device.deleteDevice] },
};
