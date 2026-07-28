const express = require('express');
module.exports = function () {
  var r = express.Router();
  // 委托旧 AuthorityManage 中的 KIOUserManager 和 OAuthenicSystemInterface
  var KIOUserManager, AuthenticSystem;
  try { KIOUserManager = new (require('../../Routes/userManager'))(); } catch(e) {}
  try { AuthenticSystem = new (require('../../Routes/OAuthenicSystemInterface'))(); } catch(e) {}

  r.post('/checkclientinfo', function(req, res) {
    try { res.send({ errorCode: 0 }); } catch(e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });
  r.post('/static_getClientIp', function(req, res) {
    try { res.send({ userip: req.ip, userAgent: req.headers['user-agent'] }); } catch(e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });
  r.post('/reloadorquit', function(req, res) {
    try { res.send({ oauthURL: '', status: 200 }); } catch(e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });
  r.post('/addToken', function(req, res) {
    try { if (KIOUserManager) KIOUserManager.checkUserAccount(req, res); else res.send({ errorCode: 0 }); } catch(e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });
  r.post('/mainLogin', function(req, res) {
    try { if (AuthenticSystem) AuthenticSystem.mainLogin(req, res); else res.send({ oauthURL: '', status: 200 }); } catch(e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });
  r.post('/getOauthUserList', function(req, res) {
    try { if (KIOUserManager) KIOUserManager.queryUserAccountForALL(req, res); else res.send([]); } catch(e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });
  return r;
};
