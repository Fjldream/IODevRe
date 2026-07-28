/**
 * controller_network.js - 网络/存储/转发控制器
 *
 * 负责网络配置、存储配置、转发配置的 HTTP 请求处理。
 * 路由配置见 app/routers/api/v1/network_router_config.js
 * 旧路径兼容适配见 compat/adapters/adapter_network.js
 */

const path = require('path');
const { request_handler } = require('../../core/utils');
const NetworkService = require('../services/NetworkService');
const StorageService = require('../services/StorageService');
const TransService = require('../services/TransService');

/**
 * 获取工程目录路径
 * @param {string} projectId
 * @returns {string}
 */
function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

class NetworkController {
  // ========== 网络 ==========

  /** @returns {NetworkService} */
  _getNetService(projectId) {
    return new NetworkService(getProjectDir(projectId));
  }

  /** @returns {StorageService} */
  _getStorageService(projectId) {
    return new StorageService(getProjectDir(projectId));
  }

  /** @returns {TransService} */
  _getTransService(projectId) {
    return new TransService(getProjectDir(projectId));
  }

  /**
   * GET /api/v1/networkProperty - 获取网络配置
   * @param {Request} req - query: { projectId }
   * @param {Response} res
   */
  async getNetworkProperty(req, res) {
    try {
      const { projectId } = request_handler.httpGetData(req);
      const property = this._getNetService(projectId).getProperty(projectId);
      res.sendOk(property);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/networkProperty - 添加/修改网络配置
   * @param {Request} req - body: { projectId, ...configData }
   * @param {Response} res
   */
  async addNetworkConfig(req, res) {
    try {
      const { projectId, ...configData } = request_handler.httpPostData(req);
      const result = this._getNetService(projectId).addConfig(projectId, configData);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // ========== 存储 ==========

  /**
   * GET /api/v1/storageList - 获取存储配置列表
   * @param {Request} req - query: { projectId }
   * @param {Response} res
   */
  async getStorageList(req, res) {
    try {
      const { projectId } = request_handler.httpGetData(req);
      const list = this._getStorageService(projectId).getList(projectId);
      res.sendOk(list);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/storageConfig - 添加存储配置
   * @param {Request} req - body: { projectId, ...configData }
   * @param {Response} res
   */
  async addStorageConfig(req, res) {
    try {
      const { projectId, ...configData } = request_handler.httpPostData(req);
      const result = this._getStorageService(projectId).addConfig(configData);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/storageConfig - 删除存储配置
   * @param {Request} req - body: { projectId, ids }
   * @param {Response} res
   */
  async deleteStorageConfig(req, res) {
    try {
      const { projectId, ids } = request_handler.httpDeleteData(req);
      const idsArr = Array.isArray(ids) ? ids : [ids];
      this._getStorageService(projectId).delete(projectId, idsArr);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/storageConfigById - 按 ID 获取存储配置
   * @param {Request} req - query: { projectId, id }
   * @param {Response} res
   */
  async getStorageById(req, res) {
    try {
      const { projectId, id } = request_handler.httpGetData(req);
      const config = this._getStorageService(projectId).getById(projectId, id);
      res.sendOk(config);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * PUT /api/v1/storageConfig - 编辑存储配置
   * @param {Request} req - body: { projectId, ...data }
   * @param {Response} res
   */
  async editStorageConfig(req, res) {
    try {
      const { projectId, ...data } = request_handler.httpPutData(req);
      const result = this._getStorageService(projectId).editConfig(data);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/getDBAPPpropety - 获取数据库属性
   * @param {Request} req - query: { dbType }
   * @param {Response} res
   */
  async getDBProperty(req, res) {
    try {
      const { dbType } = request_handler.httpGetData(req);
      const property = this._getStorageService('').getDBProperty(dbType);
      res.sendOk(property);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // ========== 转发 ==========

  /**
   * GET /api/v1/transTypes - 获取转发类型列表
   * @param {Request} req
   * @param {Response} res
   */
  async getTransTypes(req, res) {
    try {
      const types = this._getTransService('').getTypes();
      res.sendOk(types);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/transDBConfig - 获取数据库转发配置
   * @param {Request} req - query: { projectId }
   * @param {Response} res
   */
  async getTransDBConfig(req, res) {
    try {
      const { projectId } = request_handler.httpGetData(req);
      const config = this._getTransService(projectId).getDBConfig(projectId);
      res.sendOk(config);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/addTransConfig - 添加转发配置
   * @param {Request} req - body: { projectId, ...configData }
   * @param {Response} res
   */
  async addTransConfig(req, res) {
    try {
      const { projectId, ...configData } = request_handler.httpPostData(req);
      const result = this._getTransService(projectId).addConfig(configData);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/transConfigById - 按 ID 获取转发配置
   * @param {Request} req - query: { projectId, id }
   * @param {Response} res
   */
  async getTransById(req, res) {
    try {
      const { projectId, id } = request_handler.httpGetData(req);
      const config = this._getTransService(projectId).getById(projectId, id);
      res.sendOk(config);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/transConfig - 删除转发配置
   * @param {Request} req - body: { projectId, ids }
   * @param {Response} res
   */
  async deleteTransConfig(req, res) {
    try {
      const { projectId, ids } = request_handler.httpDeleteData(req);
      const idsArr = Array.isArray(ids) ? ids : [ids];
      this._getTransService(projectId).deleteConfig(projectId, idsArr);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/updateTransConfig - 更新转发配置
   * @param {Request} req - body: { projectId, ...data }
   * @param {Response} res
   */
  async updateTransConfig(req, res) {
    try {
      const { projectId, ...data } = request_handler.httpPostData(req);
      const result = this._getTransService(projectId).updateConfig(data);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }
}

module.exports = new NetworkController();
