/**
 * StorageService - 存储配置业务逻辑层
 *
 * 负责工程存储配置（数据库存储）的 CRUD 操作。
 * 底层读写工程文件 StorageInfo.json。
 * 所有路径基于 global.sdbPath。
 */

const fs = require('fs');
const path = require('path');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class StorageService {
  /**
   * @param {string} projectDir - 工程根目录路径
   */
  constructor(projectDir) {
    this.projectDir = projectDir;
  }

  /**
   * 获取 StorageInfo.json 的完整路径
   * @returns {string}
   */
  _getConfigPath() {
    return path.join(this.projectDir, 'project', 'StorageInfo.json');
  }

  /**
   * 读取 StorageInfo.json
   * @returns {{ StorageList: Array }}
   * @throws {AppError} FILE_READ_ERROR
   */
  _readConfig() {
    const fp = this._getConfigPath();
    if (!fs.existsSync(fp)) return { StorageList: [] };
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_READ_ERROR, `StorageInfo.json: ${err.message}`);
    }
  }

  /**
   * 写入 StorageInfo.json
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
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `StorageInfo.json: ${err.message}`);
    }
  }

  /**
   * 获取存储配置列表
   * @param {string} projectId - 工程 ID
   * @returns {Array<Object>} 存储配置数组
   */
  getList(projectId) {
    const config = this._readConfig();
    return config.StorageList || [];
  }

  /**
   * 添加存储配置
   * @param {Object} data - 存储配置数据
   * @returns {Object} 新创建的存储配置
   * @throws {AppError} STORAGE_CONFIG_INVALID
   */
  addConfig(data) {
    if (!data || !data.DBType) {
      throw new AppError(ErrorCodes.STORAGE_CONFIG_INVALID, '缺少数据库类型');
    }
    const config = this._readConfig();
    const list = config.StorageList || [];
    const newItem = {
      StorageID: data.StorageID || `ST_${Date.now()}_${list.length}`,
      DBType: data.DBType,
      DBHost: data.DBHost || '',
      DBPort: data.DBPort || '',
      DBName: data.DBName || '',
      DBUser: data.DBUser || '',
      DBPassword: data.DBPassword || '',
      TableName: data.TableName || '',
      Enable: data.Enable !== undefined ? data.Enable : true,
      Description: data.Description || '',
      ...data,
    };
    list.push(newItem);
    config.StorageList = list;
    this._writeConfig(config);
    return newItem;
  }

  /**
   * 删除存储配置
   * @param {string} projectId - 工程 ID
   * @param {string[]} ids - 要删除的配置 ID 数组
   * @returns {boolean}
   * @throws {AppError} STORAGE_NOT_FOUND
   */
  delete(projectId, ids) {
    const config = this._readConfig();
    const list = config.StorageList || [];
    const idsArr = Array.isArray(ids) ? ids : [ids];
    for (const id of idsArr) {
      if (!list.find((s) => s.StorageID === id)) {
        throw new AppError(ErrorCodes.STORAGE_NOT_FOUND, `ID: ${id}`);
      }
    }
    config.StorageList = list.filter((s) => !idsArr.includes(s.StorageID));
    this._writeConfig(config);
    return true;
  }

  /**
   * 根据 ID 获取存储配置
   * @param {string} projectId - 工程 ID
   * @param {string} id - 配置 ID
   * @returns {Object}
   * @throws {AppError} STORAGE_NOT_FOUND
   */
  getById(projectId, id) {
    const item = (this._readConfig().StorageList || []).find((s) => s.StorageID === id);
    if (!item) throw new AppError(ErrorCodes.STORAGE_NOT_FOUND, `ID: ${id}`);
    return item;
  }

  /**
   * 编辑存储配置
   * @param {Object} data - 要更新的配置数据（需含 StorageID）
   * @returns {Object} 更新后的配置
   * @throws {AppError} STORAGE_NOT_FOUND
   */
  editConfig(data) {
    if (!data || !data.StorageID) {
      throw new AppError(ErrorCodes.STORAGE_CONFIG_INVALID, '缺少 StorageID');
    }
    const config = this._readConfig();
    const list = config.StorageList || [];
    const index = list.findIndex((s) => s.StorageID === data.StorageID);
    if (index === -1) throw new AppError(ErrorCodes.STORAGE_NOT_FOUND, `ID: ${data.StorageID}`);
    list[index] = { ...list[index], ...data, StorageID: data.StorageID };
    config.StorageList = list;
    this._writeConfig(config);
    return list[index];
  }

  /**
   * 获取数据库属性信息
   * @param {string} dbType - 数据库类型（如 mysql, sqlserver, postgresql）
   * @returns {Object} 数据库属性
   */
  getDBProperty(dbType) {
    const props = {
      mysql: { defaultPort: 3306, driver: 'mysql', supportSSL: true },
      sqlserver: { defaultPort: 1433, driver: 'mssql', supportSSL: true },
      postgresql: { defaultPort: 5432, driver: 'pg', supportSSL: true },
      sqlite: { defaultPort: 0, driver: 'sqlite3', supportSSL: false },
      oracle: { defaultPort: 1521, driver: 'oracledb', supportSSL: true },
    };
    return props[dbType] || { defaultPort: 0, driver: '', supportSSL: false };
  }
}

module.exports = StorageService;
