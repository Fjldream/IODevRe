/**
 * adapter_network.js - 网络/存储/转发 compat 兼容适配器
 *
 * 将旧的 /Project/* 路径映射到新的 NetworkService / StorageService / TransService 调用，
 * 返回 JSON 格式与旧版完全一致。
 *
 * 对应旧文件: kingioserver/exe/Routes/ProjectManage.js
 */

const express = require('express');
const path = require('path');
const NetworkService = require('../../app/services/NetworkService');
const StorageService = require('../../app/services/StorageService');
const TransService = require('../../app/services/TransService');

function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

module.exports = function () {
  const router = express.Router();

  /** POST /Project/getNetWorkProperty - 获取网络配置 */
  router.post('/getNetWorkProperty', function (req, res) {
    try {
      const { projectId } = req.body;
      const config = new NetworkService(getProjectDir(projectId)).getProperty(projectId);
      res.send(config);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /Project/addProNetWork - 添加/修改网络配置 */
  router.post('/addProNetWork', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new NetworkService(getProjectDir(projectId)).addConfig(projectId, data);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /Project/getTransCom - 获取转发类型列表 */
  router.post('/getTransCom', function (req, res) {
    try {
      const types = new TransService('').getTypes();
      res.send(types);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /Project/getTransDBConfig - 获取转发配置列表 */
  router.post('/getTransDBConfig', function (req, res) {
    try {
      const { projectId } = req.body;
      const config = new TransService(getProjectDir(projectId)).getDBConfig(projectId);
      res.send(config);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /Project/getStorageList - 获取存储配置列表 */
  router.post('/getStorageList', function (req, res) {
    try {
      const { projectId } = req.body;
      const list = new StorageService(getProjectDir(projectId)).getList(projectId);
      res.send(list);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /Project/addStorageConfig - 添加存储配置 */
  router.post('/addStorageConfig', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new StorageService(getProjectDir(projectId)).addConfig(data);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /Project/reduceStroage - 删除存储配置 */
  router.post('/reduceStroage', function (req, res) {
    try {
      const { projectId, ids } = req.body;
      new StorageService(getProjectDir(projectId)).delete(projectId, ids);
      res.send({ Error: false });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /Project/queryOneStorage - 按 ID 查询存储配置 */
  router.post('/queryOneStorage', function (req, res) {
    try {
      const { projectId, id } = req.body;
      const config = new StorageService(getProjectDir(projectId)).getById(projectId, id);
      res.send(config);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /Project/editStorageConfig - 编辑存储配置 */
  router.post('/editStorageConfig', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new StorageService(getProjectDir(projectId)).editConfig(data);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /addTransConfig - 添加转发配置 */
  router.post('/addTransConfig', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new TransService(getProjectDir(projectId)).addConfig(data);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /** POST /updateTransConfig - 更新转发配置 */
  router.post('/updateTransConfig', function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = new TransService(getProjectDir(projectId)).updateConfig(data);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  return router;
};
