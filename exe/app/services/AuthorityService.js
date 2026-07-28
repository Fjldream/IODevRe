/**
 * AuthorityService - 权限管理业务逻辑层
 *
 * 负责用户权限验证、Token 校验、接口访问控制。
 * 支持基于角色的访问控制（RBAC）。
 */

const fs = require('fs');
const path = require('path');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class AuthorityService {
  constructor() {
    /** @type {string} exe 目录路径 */
    this.exeDir = global.__DIR || __dirname;
  }

  /**
   * 获取用户权限配置文件路径
   * @returns {string}
   */
  _getAuthorityPath() {
    return path.join(this.exeDir, 'Config', 'Authority.json');
  }

  /**
   * 读取权限配置
   * @returns {{ users: Array, roles: Array, permissions: Array }}
   */
  _readAuthority() {
    const fp = this._getAuthorityPath();
    if (!fs.existsSync(fp)) {
      return { users: [], roles: [], permissions: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (err) {
      return { users: [], roles: [], permissions: [] };
    }
  }

  /**
   * 写入权限配置
   * @param {Object} data
   * @returns {boolean}
   * @throws {AppError} FILE_WRITE_ERROR
   */
  _writeAuthority(data) {
    const fp = this._getAuthorityPath();
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
      fs.writeFileSync(fp, JSON.stringify(data, null, '\t'), 'utf8');
      return true;
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `Authority.json: ${err.message}`);
    }
  }

  /**
   * 验证 Token
   *
   * 检查 Token 是否存在且未过期。
   *
   * @param {string} token - JWT Token
   * @returns {{ valid: boolean, user: Object|null }}
   * @throws {AppError} TOKEN_INVALID | TOKEN_EXPIRED
   */
  verifyToken(token) {
    if (!token) {
      throw new AppError(ErrorCodes.TOKEN_INVALID, 'Token 为空');
    }

    // 简单 Token 校验逻辑
    // 实际项目中应集成 JWT 库验证
    const auth = this._readAuthority();
    const user = (auth.users || []).find((u) => u.Token === token);
    if (!user) {
      throw new AppError(ErrorCodes.TOKEN_INVALID, 'Token 无效');
    }

    // 检查过期
    if (user.TokenExpire && new Date(user.TokenExpire) < new Date()) {
      throw new AppError(ErrorCodes.TOKEN_EXPIRED, 'Token 已过期');
    }

    return { valid: true, user };
  }

  /**
   * 验证用户权限
   *
   * 检查用户是否拥有执行指定操作的权限。
   *
   * @param {string} userId - 用户 ID
   * @param {string} permission - 权限标识
   * @returns {boolean}
   * @throws {AppError} USER_NOT_FOUND | PERMISSION_DENIED
   */
  checkPermission(userId, permission) {
    const auth = this._readAuthority();
    const user = (auth.users || []).find((u) => u.UserID === userId);
    if (!user) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND, `用户: ${userId}`);
    }

    // 获取用户角色
    const role = (auth.roles || []).find((r) => r.RoleID === user.RoleID);
    if (!role) {
      throw new AppError(ErrorCodes.PERMISSION_DENIED, '用户未分配角色');
    }

    // 检查权限
    const hasPermission = (role.Permissions || []).includes(permission);
    if (!hasPermission) {
      throw new AppError(ErrorCodes.PERMISSION_DENIED, `缺少权限: ${permission}`);
    }

    return true;
  }

  /**
   * 用户登录
   *
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {{ user: Object, token: string }}
   * @throws {AppError} USER_NOT_FOUND | PERMISSION_DENIED
   */
  login(username, password) {
    const auth = this._readAuthority();
    const user = (auth.users || []).find(
      (u) => u.UserName === username && u.Password === password
    );
    if (!user) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND, '用户名或密码错误');
    }

    // 生成简单 Token
    const token = `token_${username}_${Date.now()}`;
    user.Token = token;
    user.TokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 小时

    this._writeAuthority(auth);
    return { user: { ...user, Password: undefined }, token };
  }

  /**
   * 获取用户列表
   * @returns {Array<Object>}
   */
  getUsers() {
    const auth = this._readAuthority();
    return (auth.users || []).map((u) => ({ ...u, Password: undefined }));
  }

  /**
   * 获取角色列表
   * @returns {Array<Object>}
   */
  getRoles() {
    return this._readAuthority().roles || [];
  }

  /**
   * 获取所有权限列表
   * @returns {Array<string>}
   */
  getPermissions() {
    return this._readAuthority().permissions || [];
  }
}

module.exports = AuthorityService;
