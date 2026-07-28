const { network } = require('../../../controllers');
module.exports = {
  get: { '/netWorkProperty': [network.getProperty], '/storageConfigs': [network.getStorageList], '/storageConfigById': [network.getStorageList], '/transTypes': [network.getTransTypes], '/transConfigs': [network.getTransList], '/dbProperty': [network.getDBProperty] },
  post: { '/netWorkConfig': [network.addConfig], '/storageConfigs': [network.addStorage], '/transConfigs': [network.addTrans] },
  put: { '/storageConfigs': [network.editStorage], '/transConfigs': [network.editTrans] },
  delete: { '/storageConfigs': [network.deleteStorage], '/transConfigs': [network.deleteTrans] },
};
