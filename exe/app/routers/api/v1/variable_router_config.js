const { variable } = require('../../../controllers');
module.exports = {
  get:    { '/variableGroups': [variable.getGroups], '/variables': [variable.getVars], '/variableProperty': [variable.getProperty] },
  post:   { '/variableGroups': [variable.createGroup], '/variables': [variable.createVar], '/moveVarToGroup': [variable.moveVar], '/exportTags': [variable.exportTags], '/importTags': [variable.importTags] },
  put:    { '/variableGroups': [variable.editGroup], '/variables': [variable.editVar] },
  delete: { '/variableGroups': [variable.deleteGroup], '/variables': [variable.deleteVar] },
};
