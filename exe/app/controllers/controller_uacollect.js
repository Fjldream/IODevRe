/**
 * controller_uacollect.js - UA OPC UA 采集控制器
 *
 * 负责 UA 设备、节点浏览、变量管理的 HTTP 请求处理。
 * 路由配置见 app/routers/api/v1/uaCollect_router_config.js
 */

const path = require('path');
const multer = require('multer');
const { request_handler } = require('../../core/utils');
const UACollectService = require('../services/UACollectService');

/**
 * 获取工程目录路径
 * @param {string} projectId
 * @returns {string}
 */
function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

/**
 * 创建 UACollectService 实例
 * @param {string} projectId
 * @returns {UACollectService}
 */
function getService(projectId) {
  return new UACollectService(getProjectDir(projectId));
}

class UACollectController {
  /**
   * POST /api/v1/uaConnect - 测试 UA 连接
   * @param {Request} req - body: { url }
   * @param {Response} res
   */
  async uaConnect(req, res) {
    try {
      const { url } = request_handler.httpPostData(req);
      const result = await getService('').uaConnect(url);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/uaDevices - 获取 UA 设备列表
   * @param {Request} req - query: { projectId }
   * @param {Response} res
   */
  async getUADevices(req, res) {
    try {
      const { projectId } = request_handler.httpGetData(req);
      const devices = getService(projectId).getDevices(projectId);
      res.sendOk(devices);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/uaDevices - 添加 UA 设备
   * @param {Request} req - body: { projectId, ...deviceData }
   * @param {Response} res
   */
  async addUADevice(req, res) {
    try {
      const { projectId, ...deviceData } = request_handler.httpPostData(req);
      const device = getService(projectId).addDevice(deviceData);
      res.sendOk(device);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * PUT /api/v1/uaDevices - 编辑 UA 设备
   * @param {Request} req - body: { projectId, id, ...data }
   * @param {Response} res
   */
  async editUADevice(req, res) {
    try {
      const { projectId, id, ...data } = request_handler.httpPutData(req);
      const device = getService(projectId).editDevice(id, data);
      res.sendOk(device);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/uaDevices - 删除 UA 设备
   * @param {Request} req - body: { projectId, ids }
   * @param {Response} res
   */
  async deleteUADevices(req, res) {
    try {
      const { projectId, ids } = request_handler.httpDeleteData(req);
      const idsArr = Array.isArray(ids) ? ids : [ids];
      getService(projectId).deleteDevices(idsArr);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/uaRootSources - 浏览根节点
   * @param {Request} req - query: { projectId }
   * @param {Response} res
   */
  async browseRootSources(req, res) {
    try {
      const params = request_handler.httpGetData(req);
      const sources = getService(params.projectId).browseRootSources(params);
      res.sendOk(sources);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/uaChildSources - 浏览子节点
   * @param {Request} req - query: { projectId, nodeId }
   * @param {Response} res
   */
  async browseChildSources(req, res) {
    try {
      const params = request_handler.httpGetData(req);
      const children = getService(params.projectId).browseChildSources(params);
      res.sendOk(children);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/uaVars - 获取 UA 变量列表
   * @param {Request} req - query: { projectId, deviceId }
   * @param {Response} res
   */
  async getUAVars(req, res) {
    try {
      const params = request_handler.httpGetData(req);
      const vars = getService(params.projectId).getVariables(params);
      res.sendOk(vars);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/uaVars - 添加 UA 变量
   * @param {Request} req - body: { projectId, ...varData }
   * @param {Response} res
   */
  async addUAVars(req, res) {
    try {
      const { projectId, ...varData } = request_handler.httpPostData(req);
      const result = getService(projectId).addVariables(varData);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * PUT /api/v1/uaVars - 编辑 UA 变量
   * @param {Request} req - body: { projectId, ...varData }
   * @param {Response} res
   */
  async editUAVars(req, res) {
    try {
      const { projectId, ...varData } = request_handler.httpPutData(req);
      const result = getService(projectId).editVariables(varData);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/uaVars - 删除 UA 变量
   * @param {Request} req - body: { projectId, ids }
   * @param {Response} res
   */
  async deleteUAVars(req, res) {
    try {
      const { projectId, ids } = request_handler.httpDeleteData(req);
      const idsArr = Array.isArray(ids) ? ids : [ids];
      getService(projectId).deleteVariables(idsArr);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/uaExportVars - 导出 UA 变量
   * @param {Request} req - body: { projectId, varIds }
   * @param {Response} res
   */
  async exportUAVars(req, res) {
    try {
      const params = request_handler.httpPostData(req);
      const result = getService(params.projectId).exportVariables(params);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/uaImportVars - 导入 UA 变量
   * @param {Request} req - multipart: file + body: { projectId }
   * @param {Response} res
   */
  async importUAVars(req, res) {
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    });

    upload.single('file')(req, res, async (err) => {
      try {
        if (err) return res.sendErr(400, err.message);
        const { projectId } = req.body;
        if (!req.file) return res.sendErr(400, '请上传文件');

        const result = getService(projectId).importVariables(req.file);
        res.sendOk(result);
      } catch (e) {
        res.sendErr(e.errorCode || 500, e.message);
      }
    });
  }
}

module.exports = new UACollectController();
