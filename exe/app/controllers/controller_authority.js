/**
 * controller_authority.js - 权限管理控制器
 *
 * 负责用户登录、Token 验证、权限检查的 HTTP 请求处理。
 * 路由配置见 app/routers/api/v1/authority_router_config.js
 * 旧路径兼容适配见 compat/adapters/adapter_authority.js
 */

const { request_handler } = require('../../core/utils');
const AuthorityService = require('../services/AuthorityService');

/**
 * 创建 AuthorityService 实例
 * @returns {AuthorityService}
 */
function getService() {
  return new AuthorityService();
}

class AuthorityController {
  /**
   * POST /api/v1/login - 用户登录
   * @param {Request} req - body: { username, password }
   * @param {Response} res
   */
  async login(req, res) {
    try {
      const { username, password } = request_handler.httpPostData(req);
      const result = getService().login(username, password);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/verifyToken - 验证 Token
   * @param {Request} req - body: { token }
   * @param {Response} res
   */
  async verifyToken(req, res) {
    try {
      const { token } = request_handler.httpPostData(req);
      const result = getService().verifyToken(token);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/checkPermission - 检查权限
   * @param {Request} req - body: { userId, permission }
   * @param {Response} res
   */
  async checkPermission(req, res) {
    try {
      const { userId, permission } = request_handler.httpPostData(req);
      const result = getService().checkPermission(userId, permission);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/users - 获取用户列表
   * @param {Request} req
   * @param {Response} res
   */
  async getUsers(req, res) {
    try {
      const users = getService().getUsers();
      res.sendOk(users);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/roles - 获取角色列表
   * @param {Request} req
   * @param {Response} res
   */
  async getRoles(req, res) {
    try {
      const roles = getService().getRoles();
      res.sendOk(roles);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/permissions - 获取权限列表
   * @param {Request} req
   * @param {Response} res
   */
  async getPermissions(req, res) {
    try {
      const permissions = getService().getPermissions();
      res.sendOk(permissions);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }
}

module.exports = new AuthorityController();
