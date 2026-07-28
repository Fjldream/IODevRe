const { driver } = require('../../../controllers');
module.exports = {
  get: { '/drivers': [driver.getDrivers], '/driverProperty': [driver.getDriverProperty], '/getPointMappingFiles': [driver.getPointMaps] },
  post: { '/drivers': [driver.installDriver], '/uploadPointMappingFile': [driver.uploadPointMap] },
  delete: { '/drivers': [driver.uninstallDriver], '/delPointMappingFile': [driver.delPointMap] },
};
