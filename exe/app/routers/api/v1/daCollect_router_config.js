const { dacollect } = require('../../../controllers');
module.exports = {
  get: { '/daDeviceGroups': [dacollect.getGroups], '/daDevices': [dacollect.getDevices], '/daVariables': [dacollect.getVars], '/daTestConnect': [dacollect.testConnect], '/daRootSources': [dacollect.browseRoot], '/daChildSources': [dacollect.browseChild] },
  post: { '/daDeviceGroups': [dacollect.addGroup], '/daDevices': [dacollect.addDevice], '/daVariables': [dacollect.addVars], '/daExportVariables': [dacollect.exportVars], '/daImportVariables': [dacollect.importVars] },
  put: { '/daDeviceGroups': [dacollect.editGroup], '/daDevices': [dacollect.editDevice], '/daVariables': [dacollect.editVars] },
  delete: { '/daDeviceGroups': [dacollect.deleteGroups], '/daDevices': [dacollect.deleteDevices], '/daVariables': [dacollect.deleteVars] },
};
