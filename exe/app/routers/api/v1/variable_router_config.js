/**
 * variable_router_config.js - 变量管理路由配置
 *
 * 定义变量组和变量相关 RESTful 接口路由。
 * 由 route_loader 动态注册。
 */

const { variable } = require('../../../controllers');

module.exports = {
  get: {
    '/variableGroups': [variable.getVariableGroups],
    '/variables': [variable.getVariables],
    '/variableProperty': [variable.getVariableProperty],
    '/registers': [variable.getRegisters],
    '/registerDataTypes': [variable.getRegisters],
  },
  post: {
    '/variableGroups': [variable.createVariableGroup],
    '/variables': [variable.createVariable],
    '/moveVarToGroup': [variable.moveVarToGroup],
    '/exportTags': [variable.exportTags],
    '/importTags': [variable.importTags],
  },
  put: {
    '/variableGroups': [variable.editVariableGroup],
    '/variables': [variable.editVariable],
  },
  delete: {
    '/variableGroups': [variable.deleteVariableGroup],
    '/variables': [variable.deleteVariable],
  },
};
