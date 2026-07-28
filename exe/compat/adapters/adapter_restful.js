/**
 * adapter_restful.js - /api/v1 旧路径兼容适配器
 *
 * 将旧的 /api/v1 路径映射到新的 Service 调用，
 * 返回 JSON 格式与旧版完全一致。
 *
 * 此适配器属于 compat 层，可整目录删除以切换到纯新接口。
 */

const express = require('express');
const path = require('path');
const UACollectService = require('../../app/services/UACollectService');
const DACollectService = require('../../app/services/DACollectService');
const RealtimeDataService = require('../../app/services/RealtimeDataService');
const TransService = require('../../app/services/TransService');

function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

module.exports = function () {
  const router = express.Router();

  // ==================== UA 接口 ====================

  /** POST /api/v1/uaConnect - 测试 UA 连接 */
  router.post('/uaConnect', async function (req, res) {
    try {
      const { url } = req.body;
      const result = await new UACollectService('').uaConnect(url);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/uaDevices - 获取 UA 设备列表 */
  router.get('/uaDevices', function (req, res) {
    try {
      const { projectId } = req.query;
      const devices = new UACollectService(getProjectDir(projectId)).getDevices(projectId);
      res.send({ Error: false, data: devices });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/uaDevices - 添加 UA 设备 */
  router.post('/uaDevices', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const device = new UACollectService(getProjectDir(projectId)).addDevice(data);
      res.send({ Error: false, data: device });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** PUT /api/v1/uaDevices - 编辑 UA 设备 */
  router.put('/uaDevices', function (req, res) {
    try {
      const { projectId, id, ...data } = req.body;
      const device = new UACollectService(getProjectDir(projectId)).editDevice(id, data);
      res.send({ Error: false, data: device });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** DELETE /api/v1/uaDevices - 删除 UA 设备 */
  router.delete('/uaDevices', function (req, res) {
    try {
      const { projectId, ids } = req.body;
      new UACollectService(getProjectDir(projectId)).deleteDevices(Array.isArray(ids) ? ids : [ids]);
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/uaRootSources - 浏览 UA 根节点 */
  router.get('/uaRootSources', function (req, res) {
    try {
      const params = req.query;
      const sources = new UACollectService(getProjectDir(params.projectId)).browseRootSources(params);
      res.send({ Error: false, data: sources });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/uaChildSources - 浏览 UA 子节点 */
  router.get('/uaChildSources', function (req, res) {
    try {
      const params = req.query;
      const children = new UACollectService(getProjectDir(params.projectId)).browseChildSources(params);
      res.send({ Error: false, data: children });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/uaVars - 获取 UA 变量列表 */
  router.get('/uaVars', function (req, res) {
    try {
      const params = req.query;
      const vars = new UACollectService(getProjectDir(params.projectId)).getVariables(params);
      res.send({ Error: false, data: vars });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/uaVars - 添加 UA 变量 */
  router.post('/uaVars', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new UACollectService(getProjectDir(projectId)).addVariables(data);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** PUT /api/v1/uaVars - 编辑 UA 变量 */
  router.put('/uaVars', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new UACollectService(getProjectDir(projectId)).editVariables(data);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** DELETE /api/v1/uaVars - 删除 UA 变量 */
  router.delete('/uaVars', function (req, res) {
    try {
      const { projectId, ids } = req.body;
      new UACollectService(getProjectDir(projectId)).deleteVariables(Array.isArray(ids) ? ids : [ids]);
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/uaExportVars - 导出 UA 变量 */
  router.post('/uaExportVars', function (req, res) {
    try {
      const params = req.body;
      const result = new UACollectService(getProjectDir(params.projectId)).exportVariables(params);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/uaImportVars - 导入 UA 变量 */
  router.post('/uaImportVars', function (req, res) {
    try {
      const formidable = require('formidable');
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) return res.send({ Error: true, ErrorDesc: err.message });
        const { projectId } = fields;
        const file = files.file;
        if (!file) return res.send({ Error: true, ErrorDesc: '请上传文件' });
        const result = new UACollectService(getProjectDir(projectId))
          .importVariables({ buffer: require('fs').readFileSync(file.path), originalname: file.name });
        res.send({ Error: false, data: result });
      });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  // ==================== DA 接口 ====================

  /** GET /api/v1/daDeviceGroups - 获取 DA 设备组列表 */
  router.get('/daDeviceGroups', function (req, res) {
    try {
      const { projectId } = req.query;
      const groups = new DACollectService(getProjectDir(projectId)).getDeviceGroups(projectId);
      res.send({ Error: false, data: groups });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/daDeviceGroups - 添加 DA 设备组 */
  router.post('/daDeviceGroups', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const group = new DACollectService(getProjectDir(projectId)).addDeviceGroup(data);
      res.send({ Error: false, data: group });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** PUT /api/v1/daDeviceGroups - 编辑 DA 设备组 */
  router.put('/daDeviceGroups', function (req, res) {
    try {
      const { projectId, id, ...data } = req.body;
      const group = new DACollectService(getProjectDir(projectId)).editDeviceGroup(id, data);
      res.send({ Error: false, data: group });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** DELETE /api/v1/daDeviceGroups - 删除 DA 设备组 */
  router.delete('/daDeviceGroups', function (req, res) {
    try {
      const { projectId, ids } = req.body;
      new DACollectService(getProjectDir(projectId)).deleteDeviceGroups(Array.isArray(ids) ? ids : [ids]);
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/daDevices - 获取 DA 设备列表 */
  router.get('/daDevices', function (req, res) {
    try {
      const params = req.query;
      const devices = new DACollectService(getProjectDir(params.projectId)).getDevices(params);
      res.send({ Error: false, data: devices });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/daDevices - 添加 DA 设备 */
  router.post('/daDevices', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const device = new DACollectService(getProjectDir(projectId)).addDevice(data);
      res.send({ Error: false, data: device });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** PUT /api/v1/daDevices - 编辑 DA 设备 */
  router.put('/daDevices', function (req, res) {
    try {
      const { projectId, id, ...data } = req.body;
      const device = new DACollectService(getProjectDir(projectId)).editDevice(id, data);
      res.send({ Error: false, data: device });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** DELETE /api/v1/daDevices - 删除 DA 设备 */
  router.delete('/daDevices', function (req, res) {
    try {
      const { projectId, ids } = req.body;
      new DACollectService(getProjectDir(projectId)).deleteDevices(Array.isArray(ids) ? ids : [ids]);
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/daVars - 获取 DA 变量列表 */
  router.get('/daVars', function (req, res) {
    try {
      const params = req.query;
      const vars = new DACollectService(getProjectDir(params.projectId)).getVariables(params);
      res.send({ Error: false, data: vars });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/daVars - 添加 DA 变量 */
  router.post('/daVars', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new DACollectService(getProjectDir(projectId)).addVariables(data);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** PUT /api/v1/daVars - 编辑 DA 变量 */
  router.put('/daVars', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new DACollectService(getProjectDir(projectId)).editVariables(data);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** DELETE /api/v1/daVars - 删除 DA 变量 */
  router.delete('/daVars', function (req, res) {
    try {
      const { projectId, ids } = req.body;
      new DACollectService(getProjectDir(projectId)).deleteVariables(Array.isArray(ids) ? ids : [ids]);
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/daTestConnect - 测试 DA 连接 */
  router.get('/daTestConnect', async function (req, res) {
    try {
      const params = req.query;
      const result = await new DACollectService(getProjectDir(params.projectId)).testConnect(params);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/daRootSources - 浏览 DA 根节点 */
  router.get('/daRootSources', function (req, res) {
    try {
      const params = req.query;
      const sources = new DACollectService(getProjectDir(params.projectId)).browseRootSources(params);
      res.send({ Error: false, data: sources });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/daChildSources - 浏览 DA 子节点 */
  router.get('/daChildSources', function (req, res) {
    try {
      const params = req.query;
      const children = new DACollectService(getProjectDir(params.projectId)).browseChildSources(params);
      res.send({ Error: false, data: children });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/daExportVars - 导出 DA 变量 */
  router.post('/daExportVars', function (req, res) {
    try {
      const params = req.body;
      const result = new DACollectService(getProjectDir(params.projectId)).exportVariables(params);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/daImportVars - 导入 DA 变量 */
  router.post('/daImportVars', function (req, res) {
    try {
      const formidable = require('formidable');
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) return res.send({ Error: true, ErrorDesc: err.message });
        const { projectId } = fields;
        const file = files.file;
        if (!file) return res.send({ Error: true, ErrorDesc: '请上传文件' });
        const result = new DACollectService(getProjectDir(projectId))
          .importVariables({ buffer: require('fs').readFileSync(file.path), originalname: file.name });
        res.send({ Error: false, data: result });
      });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  // ==================== 实时数据接口 ====================

  /** GET /api/v1/batchrealvalue - 批量获取实时值 */
  router.get('/batchrealvalue', function (req, res) {
    try {
      const { tagNames } = req.query;
      const names = typeof tagNames === 'string' ? tagNames.split(',') : (tagNames || []);
      const values = new RealtimeDataService().getBatchRealValue(names);
      res.send({ Error: false, data: values });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/realtimeVarInfo - 获取实时变量信息 */
  router.get('/realtimeVarInfo', function (req, res) {
    try {
      const { projectName } = req.query;
      const info = new RealtimeDataService().getRealtimeVarInfo(projectName);
      res.send({ Error: false, data: info });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  // ==================== 转发接口 ====================

  /** POST /api/v1/addTransConfig - 添加转发配置 */
  router.post('/addTransConfig', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new TransService(getProjectDir(projectId)).addConfig(data);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /api/v1/updateTransConfig - 更新转发配置 */
  router.post('/updateTransConfig', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new TransService(getProjectDir(projectId)).updateConfig(data);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** GET /api/v1/getDBAPPpropety - 获取数据库属性 */
  router.get('/getDBAPPpropety', function (req, res) {
    try {
      const { dbType } = req.query;
      const dbTypeMap = {
        '0': 'mysql',
        '1': 'sqlserver',
        '2': 'postgresql',
        '3': 'oracle',
        '4': 'sqlite',
      };
      const resolvedType = dbTypeMap[dbType] || dbType || 'mysql';
      const StorageService = require('../../app/services/StorageService');
      const property = new StorageService('').getDBProperty(resolvedType);
      res.send({ Error: false, data: property });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  return router;
};
