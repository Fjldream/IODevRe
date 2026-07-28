/**
 * controller_variable.js - 变量管理控制器
 *
 * 处理变量组和变量的 HTTP 请求，包括创建、编辑、删除、移动，
 * 以及导入导出（JSON / CSV 格式）。
 *
 * 路由: app/routers/api/v1/variable_router_config.js
 * 旧路径兼容: compat/adapters/adapter_variable.js
 */

const path = require('path');
const multer = require('multer');
const { request_handler } = require('../../core/utils');
const VariableService = require('../services/VariableService');

/** @returns {string} 工程目录路径 */
function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

/** @returns {VariableService} */
function getService(projectId) {
  return new VariableService(getProjectDir(projectId));
}

class VariableController {
  // ========== 变量组 ==========

  /** GET /api/v1/variableGroups */
  async getVariableGroups(req, res) {
    try {
      const { projectId } = request_handler.httpGetData(req);
      res.sendOk(getService(projectId).getVariableGroupTree());
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** POST /api/v1/variableGroups */
  async createVariableGroup(req, res) {
    try {
      const { projectId, ...d } = request_handler.httpPostData(req);
      res.sendOk(getService(projectId).createVariableGroup(d));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** PUT /api/v1/variableGroups */
  async editVariableGroup(req, res) {
    try {
      const { projectId, groupId, ...d } = request_handler.httpPutData(req);
      res.sendOk(getService(projectId).editVariableGroup(groupId, d));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** DELETE /api/v1/variableGroups */
  async deleteVariableGroup(req, res) {
    try {
      const { projectId, groupId } = request_handler.httpDeleteData(req);
      res.sendOk(getService(projectId).deleteVariableGroup(groupId));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  // ========== 变量 ==========

  /** GET /api/v1/variables */
  async getVariables(req, res) {
    try {
      const { projectId, groupId } = request_handler.httpGetData(req);
      res.sendOk(getService(projectId).getVariables(groupId || null));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** POST /api/v1/variables */
  async createVariable(req, res) {
    try {
      const { projectId, ...d } = request_handler.httpPostData(req);
      res.sendOk(getService(projectId).createVariable(d));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** PUT /api/v1/variables */
  async editVariable(req, res) {
    try {
      const { projectId, tagId, ...d } = request_handler.httpPutData(req);
      res.sendOk(getService(projectId).editVariable(tagId, d));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** DELETE /api/v1/variables */
  async deleteVariable(req, res) {
    try {
      const { projectId, tagIds } = request_handler.httpDeleteData(req);
      const ids = Array.isArray(tagIds) ? tagIds : [tagIds];
      res.sendOk(getService(projectId).deleteVariables(ids));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** POST /api/v1/moveVarToGroup */
  async moveVarToGroup(req, res) {
    try {
      const { projectId, varIds, targetVarGroupId } = request_handler.httpPostData(req);
      res.sendOk(getService(projectId).moveVariablesToGroup(varIds, targetVarGroupId));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** GET /api/v1/variableProperty */
  async getVariableProperty(req, res) {
    try {
      const { projectId, tagId } = request_handler.httpGetData(req);
      res.sendOk(getService(projectId).getVariableProperty(tagId));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  // ========== 导入导出 ==========

  /** POST /api/v1/exportTags */
  async exportTags(req, res) {
    try {
      const { projectId, tagList, allExportFlag, fileType } = request_handler.httpPostData(req);
      const tags = getService(projectId).exportVariables(tagList, allExportFlag);

      if (fileType === 'csv' && tags.length > 0) {
        const { Parser } = require('json2csv');
        const fields = Object.keys(tags[0]);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=tags.csv');
        res.send(new Parser({ fields }).parse(tags));
      } else {
        res.sendOk(tags);
      }
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** POST /api/v1/importTags - 支持三种导入模式 */
  async importTags(req, res) {
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    });

    upload.array('tagsFiles', 1)(req, res, async (err) => {
      try {
        if (err) return res.sendErr(400, err.message);
        const { projectId, importMode, groupId, groupName } = req.body;
        const file = req.files?.[0];
        if (!file) return res.sendErr(400, '请上传文件');

        let varData = [];
        const content = file.buffer.toString('utf8');
        if (file.originalname.endsWith('.json')) {
          varData = JSON.parse(content);
        } else if (file.originalname.endsWith('.csv')) {
          const csv2Json = require('csvtojson');
          varData = await csv2Json().fromString(content);
        }

        res.sendOk(getService(projectId).importVariables(varData, {
          mode: importMode || 'append',
          groupId,
          groupName,
        }));
      } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
    });
  }

  /** GET /api/v1/registers */
  async getRegisters(req, res) {
    try {
      const { projectId, deviceName } = request_handler.httpGetData(req);
      res.sendOk(getService(projectId).getRegisters(deviceName));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }
}

module.exports = new VariableController();
