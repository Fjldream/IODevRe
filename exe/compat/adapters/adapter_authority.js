/**
 * adapter_authority.js - 权限管理 compat 兼容适配器
 *
 * 将旧的登录/权限路径映射到新的 AuthorityService 调用，
 * 返回 JSON 格式与旧版完全一致。
 */

const express = require('express');
const AuthorityService = require('../../app/services/AuthorityService');

module.exports = function () {
  const router = express.Router();

  /**
   * POST /login
   * 用户登录
   */
  router.post('/login', function (req, res) {
    try {
      const { username, password } = req.body;
      const result = new AuthorityService().login(username, password);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /verifyToken
   * 验证 Token
   */
  router.post('/verifyToken', function (req, res) {
    try {
      const { token } = req.body;
      const result = new AuthorityService().verifyToken(token);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /checkPermission
   * 检查用户权限
   */
  router.post('/checkPermission', function (req, res) {
    try {
      const { userId, permission } = req.body;
      const result = new AuthorityService().checkPermission(userId, permission);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  return router;
};
