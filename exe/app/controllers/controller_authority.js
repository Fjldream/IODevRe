const { request_handler } = require('../../core/utils');
const AuthorityService = require('../services/AuthorityService');
class AuthorityController {
  async validateToken(req, res) { try { res.sendOk(new AuthorityService().validateToken(req.headers.authorization)); } catch (e) { res.sendErr(500, e.message); } }
  async checkPermission(req, res) { try { res.sendOk(new AuthorityService().checkPermission(req.userInfo, req.body.resource)); } catch (e) { res.sendErr(500, e.message); } }
}
module.exports = new AuthorityController();
