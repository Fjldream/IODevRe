const { uacollect } = require('../../../controllers');
module.exports = {
  get: { '/uaDevices': [uacollect.getDevices], '/uaVariables': [uacollect.getVars], '/uaRootSources': [uacollect.browseRoot], '/uaChildSources': [uacollect.browseChild] },
  post: { '/uaConnect': [uacollect.connect], '/uaDevices': [uacollect.addDevice], '/uaVariables': [uacollect.addVars], '/uaExportVariables': [uacollect.exportVars], '/uaImportVariables': [uacollect.importVars] },
  put: { '/uaDevices': [uacollect.editDevice], '/uaVariables': [uacollect.editVars] },
  delete: { '/uaDevices': [uacollect.deleteDevices], '/uaVariables': [uacollect.deleteVars] },
};
