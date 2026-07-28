/**
 * controller_dacollect.js - DA 采集控制器
 *
 * 负责 DA 设备组、设备、节点浏览、变量管理的 HTTP 请求处理。
 * 路由配置见 app/routers/api/v1/daCollect_router_config.js
 */

const path = require('path');
const multer = require('multer');
const { request_handler } = require('../../core/utils');
const DACollectService = require('../services/DACollectService');

/**
 * 获取工程目录路径
 * @param {string} projectId
 * @returns {string}
 */
function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

/**
 * 创建 DACollectService 实例
 * @param {string} projectId
 * @returns {DACollectService}
 */
function getService(projectId) {
  return new DACollectService(getProjectDir(projectId));
}

class DACollectController {
  // ========== 设备组 ==========

  /**
   * GET /api/v1/daDeviceGroups - 获取 DA 设备组列表
   * @param {Request} req - query: { projectId }
   * @param {Response} res
   */
  async getDADeviceGroups(req, res) {
    try {
      const { projectId } = request_handler.httpGetData(req);
      res.sendOk(getService(projectId).getDeviceGroups(projectId));
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/daDeviceGroups - 添加 DA 设备组
   * @param {Request} req - body: { projectId, ...groupData }
   * @param {Response} res
   */
  async addDADeviceGroup(req, res) {
    try {
      const { projectId, ...groupData } = request_handler.httpPostData(req);
      const group = getService(projectId).addDeviceGroup(groupData);
      res.sendOk(group);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * PUT /api/v1/daDeviceGroups - 编辑 DA 设备组
   * @param {Request} req - body: { projectId, id, ...data }
   * @param {Response} res
   */
  async editDADeviceGroup(req, res) {
    try {
      const { projectId, id, ...data } = request_handler.httpPutData(req);
      const group = getService(projectId).editDeviceGroup(id, data);
      res.sendOk(group);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/daDeviceGroups - 删除 DA 设备组
   * @param {Request} req - body: { projectId, ids }
   * @param {Response} res
   */
  async deleteDADeviceGroups(req, res) {
    try {
      const { projectId, ids } = request_handler.httpDeleteData(req);
      const idsArr = Array.isArray(ids) ? ids : [ids];
      getService(projectId).deleteDeviceGroups(idsArr);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // ========== 设备 ==========

  /**
   * GET /api/v1/daDevices - 获取 DA 设备列表
   * @param {Request} req - query: { projectId, groupId }
   * @param {Response} res
   */
  async getDADevices(req, res) {
    try {
      const params = request_handler.httpGetData(req);
      res.sendOk(getService(params.projectId).getDevices(params));
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/daDevices - 添加 DA 设备
   * @param {Request} req - body: { projectId, ...deviceData }
   * @param {Response} res
   */
  async addDADevice(req, res) {
    try {
      const { projectId, ...deviceData } = request_handler.httpPostData(req);
      const device = getService(projectId).addDevice(deviceData);
      res.sendOk(device);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * PUT /api/v1/daDevices - 编辑 DA 设备
   * @param {Request} req - body: { projectId, id, ...data }
   * @param {Response} res
   */
  async editDADevice(req, res) {
    try {
      const { projectId, id, ...data } = request_handler.httpPutData(req);
      const device = getService(projectId).editDevice(id, data);
      res.sendOk(device);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/daDevices - 删除 DA 设备
   * @param {Request} req - body: { projectId, ids }
   * @param {Response} res
   */
  async deleteDADevices(req, res) {
    try {
      const { projectId, ids } = request_handler.httpDeleteData(req);
      const idsArr = Array.isArray(ids) ? ids : [ids];
      getService(projectId).deleteDevices(idsArr);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // ========== 变量 ==========

  /**
   * GET /api/v1/daVars - 获取 DA 变量列表
   * @param {Request} req - query: { projectId, deviceId }
   * @param {Response} res
   */
  async getDAVars(req, res) {
    try {
      const params = request_handler.httpGetData(req);
      res.sendOk(getService(params.projectId).getVariables(params));
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/daVars - 添加 DA 变量
   * @param {Request} req - body: { projectId, ...varData }
   * @param {Response} res
   */
  async addDAVars(req, res) {
    try {
      const { projectId, ...varData } = request_handler.httpPostData(req);
      const result = getService(projectId).addVariables(varData);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * PUT /api/v1/daVars - 编辑 DA 变量
   * @param {Request} req - body: { projectId, ...varData }
   * @param {Response} res
   */
  async editDAVars(req, res) {
    try {
      const { projectId, ...varData } = request_handler.httpPutData(req);
      const result = getService(projectId).editVariables(varData);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/daVars - 删除 DA 变量
   * @param {Request} req - body: { projectId, ids }
   * @param {Response} res
   */
  async deleteDAVars(req, res) {
    try {
      const { projectId, ids } = request_handler.httpDeleteData(req);
      const idsArr = Array.isArray(ids) ? ids : [ids];
      getService(projectId).deleteVariables(idsArr);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // ========== 连接测试 ==========

  /**
   * GET /api/v1/daTestConnect - 测试 DA 连接
   * @param {Request} req - query: { projectId, deviceId, address }
   * @param {Response} res
   */
  async testConnect(req, res) {
    try {
      const params = request_handler.httpGetData(req);
      const result = await getService(params.projectId).testConnect(params);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/daRootSources - 浏览 DA 根节点
   * @param {Request} req - query: { projectId }
   * @param {Response} res
   */
  async browseRootSources(req, res) {
    try {
      const params = request_handler.httpGetData(req);
      res.sendOk(getService(params.projectId).browseRootSources(params));
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/daChildSources - 浏览 DA 子节点
   * @param {Request} req - query: { projectId, nodeId }
   * @param {Response} res
   */
  async browseChildSources(req, res) {
    try {
      const params = request_handler.httpGetData(req);
      res.sendOk(getService(params.projectId).browseChildSources(params));
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  // ========== 导入导出 ==========

  /**
   * POST /api/v1/daExportVars - 导出 DA 变量
   * @param {Request} req - body: { projectId, varIds }
   * @param {Response} res
   */
  async exportDAVars(req, res) {
    try {
      const params = request_handler.httpPostData(req);
      res.sendOk(getService(params.projectId).exportVariables(params));
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/daImportVars - 导入 DA 变量
   * @param {Request} req - multipart: file + body: { projectId }
   * @param {Response} res
   */
  async importDAVars(req, res) {
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

module.exports = new DACollectController();
