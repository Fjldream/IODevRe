/**
 * adapter_driver.js - 驱动管理 compat 兼容适配器
 *
 * 将旧的 /DriverManage/* 路径映射到新的 DriverService 调用，
 * 返回 JSON 格式与旧版完全一致。
 *
 * 此适配器属于 compat 层，可整目录删除以切换到纯新接口。
 */

const express = require('express');
const path = require('path');
const DriverService = require('../../app/services/DriverService');

module.exports = function () {
  const router = express.Router();

  /**
   * POST /DriverManage/getDriverConfig
   * 获取驱动属性
   */
  router.post('/getDriverConfig', function (req, res) {
    try {
      const { driverName } = req.body;
      const service = new DriverService();
      const config = service.getDriverProperty(driverName);
      res.send({ Error: false, data: config });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /DriverManage/getAllDriverList
   * 获取所有驱动列表
   */
  router.post('/getAllDriverList', function (req, res) {
    try {
      const service = new DriverService();
      res.send({ Error: false, data: service.getDrivers() });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /DriverManage/driverInstall
   * 安装驱动
   */
  router.post('/driverInstall', function (req, res) {
    try {
      const formidable = require('formidable');
      const form = new formidable.IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) return res.send({ Error: true, ErrorDesc: err.message });
        const data = { ...fields };
        if (files.driverFile) {
          data.driverFile = require('fs').readFileSync(files.driverFile.path);
        }
        try {
          const result = new DriverService().installDriver(data);
          res.send({ Error: false, data: result });
        } catch (e) {
          res.send({ Error: true, ErrorDesc: e.message });
        }
      });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /DriverManage/driverUninstall
   * 卸载驱动
   */
  router.post('/driverUninstall', function (req, res) {
    try {
      const { driverName } = req.body;
      new DriverService().uninstallDriver(driverName);
      res.send({ Error: false, data: 'OK' });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  return router;
};
