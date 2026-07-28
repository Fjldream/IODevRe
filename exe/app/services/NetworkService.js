/**
 * NetworkService - 网络配置业务逻辑层
 *
 * 负责工程网络配置的读写操作。
 * 底层读写工程文件 NetworkInfo.json。
 * 所有路径基于 global.sdbPath。
 */

const fs = require('fs');
const path = require('path');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class NetworkService {
  /**
   * @param {string} projectDir - 工程根目录路径
   */
  constructor(projectDir) {
    this.projectDir = projectDir;
  }

  /**
   * 获取 NetworkInfo.json 的完整路径
   * @returns {string}
   */
  _getConfigPath() {
    return path.join(this.projectDir, 'project', 'NetworkInfo.json');
  }

  /**
   * 读取 NetworkInfo.json
   * @returns {Object}
   * @throws {AppError} FILE_READ_ERROR
   */
  _readConfig() {
    const fp = this._getConfigPath();
    if (!fs.existsSync(fp)) return {};
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_READ_ERROR, `NetworkInfo.json: ${err.message}`);
    }
  }

  /**
   * 写入 NetworkInfo.json
   * @param {Object} data
   * @returns {boolean}
   * @throws {AppError} FILE_WRITE_ERROR
   */
  _writeConfig(data) {
    const fp = this._getConfigPath();
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
      fs.writeFileSync(fp, JSON.stringify(data, null, '\t'), 'utf8');
      return true;
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `NetworkInfo.json: ${err.message}`);
    }
  }

  /**
   * 获取网络配置属性
   * @param {string} projectId - 工程 ID
   * @returns {Object} 网络配置对象
   */
  getProperty(projectId) {
    return this._readConfig();
  }

  /**
   * 添加或修改网络配置
   * @param {string} projectId - 工程 ID
   * @param {Object} data - 网络配置数据
   * @returns {Object} 更新后的网络配置
   * @throws {AppError} NETWORK_CONFIG_INVALID
   */
  addConfig(projectId, data) {
    if (!data || typeof data !== 'object') {
      throw new AppError(ErrorCodes.NETWORK_CONFIG_INVALID, '配置数据不能为空');
    }
    const config = this._readConfig();
    const newConfig = { ...config, ...data };
    this._writeConfig(newConfig);
    return newConfig;
  }
}

module.exports = NetworkService;
