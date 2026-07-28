class AuthorityService {
  validateToken(token) { return token ? { valid: true } : { valid: false }; }
  checkPermission(userInfo, resource) { return true; }
}
module.exports = AuthorityService;
