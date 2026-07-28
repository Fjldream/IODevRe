/**
 * controller_driver.js - 驱动管理控制器
 *
 * 负责驱动安装、卸载、查询，以及点位映射文件管理的 HTTP 请求处理。
 * 路由配置见 app/routers/api/v1/driver_router_config.js
 * 旧路径兼容适配见 compat/adapters/adapter_driver.js
 */

const path = require('path');
const multer = require('multer');
const { request_handler } = require('../../core/utils');
const DriverService = require('../services/DriverService');

/**
 * 创建 DriverService 实例
 * @returns {DriverService}
 */
function getService() {
  return new DriverService();
}

class DriverController {
  /**
   * GET /api/v1/drivers - 获取驱动列表
   * @param {Request} req
   * @param {Response} res
   */
  async getDrivers(req, res) {
    try {
      const drivers = getService().getDrivers();
      res.sendOk(drivers);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/drivers - 安装驱动
   * @param {Request} req - body: { DriverName, DriverVersion, ... }
   * @param {Response} res
   */
  async installDriver(req, res) {
    try {
      const data = req.file ? { ...req.body, driverFile: req.file.buffer } : req.body;
      const driver = getService().installDriver(data);
      res.sendOk(driver);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/drivers - 卸载驱动
   * @param {Request} req - body: { driverName }
   * @param {Response} res
   */
  async uninstallDriver(req, res) {
    try {
      const { driverName } = request_handler.httpDeleteData(req);
      getService().uninstallDriver(driverName);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/driverProperty - 获取驱动属性
   * @param {Request} req - query: { driverName }
   * @param {Response} res
   */
  async getDriverProperty(req, res) {
    try {
      const { driverName } = request_handler.httpGetData(req);
      const property = getService().getDriverProperty(driverName);
      res.sendOk(property);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/getPointMappingFiles - 获取点位映射文件列表
   * @param {Request} req
   * @param {Response} res
   */
  async getPointMappingFiles(req, res) {
    try {
      const files = getService().getPointMappingFiles();
      res.sendOk(files);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/uploadPointMappingFile - 上传点位映射文件
   * @param {Request} req - multipart: file + body: { driverName }
   * @param {Response} res
   */
  async uploadPointMapping(req, res) {
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    });

    upload.single('file')(req, res, async (err) => {
      try {
        if (err) return res.sendErr(400, err.message);
        const { driverName } = req.body;
        if (!req.file) return res.sendErr(400, '请上传文件');

        const result = getService().uploadPointMapping(driverName, req.file);
        res.sendOk(result);
      } catch (e) {
        res.sendErr(e.errorCode || 500, e.message);
      }
    });
  }

  /**
   * DELETE /api/v1/delPointMappingFile - 删除点位映射文件
   * @param {Request} req - body: { driverName, fileName }
   * @param {Response} res
   */
  async delPointMapping(req, res) {
    try {
      const { driverName, fileName } = request_handler.httpDeleteData(req);
      getService().delPointMapping(driverName, fileName);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }
}

module.exports = new DriverController();
