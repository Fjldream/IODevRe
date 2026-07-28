/**
 * authority_router_config.js - 权限管理路由配置
 *
 * 定义权限管理相关 RESTful 接口路由及其处理器。
 */

const { authority } = require('../../../controllers');

module.exports = {
  get: {
    '/users': [authority.getUsers],
    '/roles': [authority.getRoles],
    '/permissions': [authority.getPermissions],
  },
  post: {
    '/login': [authority.login],
    '/verifyToken': [authority.verifyToken],
    '/checkPermission': [authority.checkPermission],
  },
};
