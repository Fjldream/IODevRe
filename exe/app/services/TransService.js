/**
 * TransService - 转发配置业务逻辑层
 *
 * 负责工程转发配置（数据传输转发）的 CRUD 操作。
 * 底层读写工程文件 TransInfo.json。
 * 所有路径基于 global.sdbPath。
 */

const fs = require('fs');
const path = require('path');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class TransService {
  /**
   * @param {string} projectDir - 工程根目录路径
   */
  constructor(projectDir) {
    this.projectDir = projectDir;
  }

  /**
   * 获取 TransInfo.json 的完整路径
   * @returns {string}
   */
  _getConfigPath() {
    return path.join(this.projectDir, 'project', 'TransInfo.json');
  }

  /**
   * 读取 TransInfo.json
   * @returns {{ TransList: Array }}
   * @throws {AppError} FILE_READ_ERROR
   */
  _readConfig() {
    const fp = this._getConfigPath();
    if (!fs.existsSync(fp)) return { TransList: [] };
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_READ_ERROR, `TransInfo.json: ${err.message}`);
    }
  }

  /**
   * 写入 TransInfo.json
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
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `TransInfo.json: ${err.message}`);
    }
  }

  /**
   * 获取转发类型列表
   * @returns {Array<{ type: string, name: string }>}
   */
  getTypes() {
    return [
      { type: 'mqtt', name: 'MQTT' },
      { type: 'kafka', name: 'Kafka' },
      { type: 'rabbitmq', name: 'RabbitMQ' },
      { type: 'http', name: 'HTTP' },
      { type: 'websocket', name: 'WebSocket' },
      { type: 'opcua', name: 'OPC UA' },
    ];
  }

  /**
   * 获取数据库转发配置列表
   * @param {string} projectId - 工程 ID
   * @returns {Array<Object>}
   */
  getDBConfig(projectId) {
    const config = this._readConfig();
    return config.TransList || [];
  }

  /**
   * 添加转发配置
   * @param {Object} data - 转发配置数据
   * @returns {Object}
   * @throws {AppError} TRANS_CONFIG_INVALID
   */
  addConfig(data) {
    if (!data || !data.TransType) {
      throw new AppError(ErrorCodes.TRANS_CONFIG_INVALID, '缺少转发类型');
    }
    const config = this._readConfig();
    const list = config.TransList || [];
    const newItem = {
      TransID: data.TransID || `Trans_${Date.now()}_${list.length}`,
      TransType: data.TransType,
      TransName: data.TransName || '',
      ServerHost: data.ServerHost || '',
      ServerPort: data.ServerPort || '',
      Topic: data.Topic || '',
      UserName: data.UserName || '',
      Password: data.Password || '',
      Enable: data.Enable !== undefined ? data.Enable : true,
      Description: data.Description || '',
      ...data,
    };
    list.push(newItem);
    config.TransList = list;
    this._writeConfig(config);
    return newItem;
  }

  /**
   * 根据 ID 获取转发配置
   * @param {string} projectId - 工程 ID
   * @param {string} id - 配置 ID
   * @returns {Object}
   * @throws {AppError} TRANS_NOT_FOUND
   */
  getById(projectId, id) {
    const item = (this._readConfig().TransList || []).find((t) => t.TransID === id);
    if (!item) throw new AppError(ErrorCodes.TRANS_NOT_FOUND, `ID: ${id}`);
    return item;
  }

  /**
   * 删除转发配置
   * @param {string} projectId - 工程 ID
   * @param {string[]} ids - 配置 ID 数组
   * @returns {boolean}
   * @throws {AppError} TRANS_NOT_FOUND
   */
  deleteConfig(projectId, ids) {
    const config = this._readConfig();
    const list = config.TransList || [];
    const idsArr = Array.isArray(ids) ? ids : [ids];
    for (const id of idsArr) {
      if (!list.find((t) => t.TransID === id)) {
        throw new AppError(ErrorCodes.TRANS_NOT_FOUND, `ID: ${id}`);
      }
    }
    config.TransList = list.filter((t) => !idsArr.includes(t.TransID));
    this._writeConfig(config);
    return true;
  }

  /**
   * 更新转发配置
   * @param {Object} data - 要更新的配置数据（需含 TransID）
   * @returns {Object} 更新后的配置
   * @throws {AppError} TRANS_NOT_FOUND
   */
  updateConfig(data) {
    if (!data || !data.TransID) {
      throw new AppError(ErrorCodes.TRANS_CONFIG_INVALID, '缺少 TransID');
    }
    const config = this._readConfig();
    const list = config.TransList || [];
    const index = list.findIndex((t) => t.TransID === data.TransID);
    if (index === -1) throw new AppError(ErrorCodes.TRANS_NOT_FOUND, `ID: ${data.TransID}`);
    list[index] = { ...list[index], ...data, TransID: data.TransID };
    config.TransList = list;
    this._writeConfig(config);
    return list[index];
  }
}

module.exports = TransService;
