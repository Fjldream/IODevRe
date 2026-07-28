/**
 * controller_device.js - 设备管理控制器
 *
 * 负责设备组和设备相关 HTTP 请求的接收、参数提取、Service 调度和响应。
 * 路由配置见 app/routers/api/v1/device_router_config.js
 * 旧路径兼容适配见 compat/adapters/adapter_device.js
 */

const path = require('path');
const multer = require('multer');
const { request_handler } = require('../../core/utils');
const DeviceService = require('../services/DeviceService');

/**
 * 根据 projectId 获取工程目录路径
 * @param {string} projectId
 * @returns {string}
 */
function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

/**
 * 创建 DeviceService 实例
 * @param {string} projectId
 * @returns {DeviceService}
 */
function getService(projectId) {
  return new DeviceService(getProjectDir(projectId));
}

class DeviceController {
  /**
   * GET /api/v1/deviceGroups - 获取设备组树
   * @param {Request} req - query: projectId
   * @param {Response} res
   */
  async getDeviceGroupTree(req, res) {
    try {
      const { projectId } = request_handler.httpGetData(req);
      const tree = getService(projectId).getDeviceGroupTree();
      res.sendOk(tree);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/deviceGroups - 创建设备组
   * @param {Request} req - body: { projectId, DeviceGroupName, ParentID }
   * @param {Response} res
   */
  async createDeviceGroup(req, res) {
    try {
      const { projectId, ...groupData } = request_handler.httpPostData(req);
      const group = getService(projectId).createDeviceGroup(groupData);
      res.sendOk(group);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * PUT /api/v1/deviceGroups - 编辑设备组
   * @param {Request} req - body: { projectId, groupId, DeviceGroupName }
   * @param {Response} res
   */
  async editDeviceGroup(req, res) {
    try {
      const { projectId, groupId, ...groupData } = request_handler.httpPutData(req);
      const group = getService(projectId).editDeviceGroup(groupId, groupData);
      res.sendOk(group);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/deviceGroups - 删除设备组
   * @param {Request} req - body: { projectId, groupId }
   * @param {Response} res
   */
  async deleteDeviceGroup(req, res) {
    try {
      const { projectId, groupId } = request_handler.httpDeleteData(req);
      getService(projectId).deleteDeviceGroup(groupId);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/devices - 获取设备列表
   * @param {Request} req - query: projectId, [deviceGroupId]
   * @param {Response} res
   */
  async getDevices(req, res) {
    try {
      const { projectId, deviceGroupId } = request_handler.httpGetData(req);
      const devices = getService(projectId).getDevices(deviceGroupId || null);
      res.sendOk(devices);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/devices - 创建设备
   * @param {Request} req - body: { projectId, ...deviceData }
   * @param {Response} res
   */
  async createDevice(req, res) {
    try {
      const { projectId, ...deviceData } = request_handler.httpPostData(req);
      const device = getService(projectId).createDevice(deviceData);
      res.sendOk(device);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * PUT /api/v1/devices - 编辑设备
   * @param {Request} req - body: { projectId, deviceId, ...deviceData }
   * @param {Response} res
   */
  async editDevice(req, res) {
    try {
      const { projectId, deviceId, ...deviceData } = request_handler.httpPutData(req);
      const device = getService(projectId).editDevice(deviceId, deviceData);
      res.sendOk(device);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * DELETE /api/v1/devices - 删除设备
   * @param {Request} req - body: { projectId, deviceIds }
   * @param {Response} res
   */
  async deleteDevice(req, res) {
    try {
      const { projectId, deviceIds } = request_handler.httpDeleteData(req);
      const ids = Array.isArray(deviceIds) ? deviceIds : [deviceIds];
      getService(projectId).deleteDevices(ids);
      res.sendOk(true);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/moveDevice - 移动设备到其他组
   * @param {Request} req - body: { projectId, deviceIds, targetDeviceGroupId }
   * @param {Response} res
   */
  async moveDevice(req, res) {
    try {
      const { projectId, deviceIds, targetDeviceGroupId } = request_handler.httpPostData(req);
      const result = getService(projectId).moveDevices(deviceIds, targetDeviceGroupId);
      res.sendOk(result);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * GET /api/v1/deviceProperty - 获取设备属性
   * @param {Request} req - query: { projectId, deviceId }
   * @param {Response} res
   */
  async getDeviceProperty(req, res) {
    try {
      const { projectId, deviceId } = request_handler.httpGetData(req);
      const property = getService(projectId).getDeviceProperty(deviceId);
      res.sendOk(property);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/exportDevices - 导出设备
   * @param {Request} req - body: { projectId, systemType, fileType, deviceNames }
   * @param {Response} res
   */
  async exportDevices(req, res) {
    try {
      const { projectId, fileType, deviceNames } = request_handler.httpPostData(req);
      const devices = getService(projectId)
        .getDevices()
        .filter((d) => deviceNames.includes(d.DeviceName));

      if (fileType === 'csv' && devices.length > 0) {
        const { Parser } = require('json2csv');
        const fields = Object.keys(devices[0]);
        const parser = new Parser({ fields });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=devices.csv');
        res.send(parser.parse(devices));
      } else {
        res.sendOk(devices);
      }
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }

  /**
   * POST /api/v1/importDevices - 导入设备（支持 JSON / CSV）
   * @param {Request} req - multipart: devicesFile + body: { projectId, groupId }
   * @param {Response} res
   */
  async importDevices(req, res) {
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    });

    upload.array('devicesFile', 1)(req, res, async (err) => {
      try {
        if (err) return res.sendErr(400, err.message);
        const { projectId, groupId } = req.body;
        const file = req.files ? req.files[0] : null;
        if (!file) return res.sendErr(400, '请上传文件');

        let deviceData = [];
        if (file.originalname.endsWith('.json')) {
          deviceData = JSON.parse(file.buffer.toString('utf8'));
        } else if (file.originalname.endsWith('.csv')) {
          const csv2Json = require('csvtojson');
          deviceData = await csv2Json().fromString(file.buffer.toString('utf8'));
        }

        if (groupId) {
          deviceData = deviceData.map((d) => ({ ...d, DeviceGroupID: groupId }));
        }

        const result = getService(projectId).createDevicesBatch(deviceData);
        res.sendOk(result);
      } catch (e) {
        res.sendErr(e.errorCode || 500, e.message);
      }
    });
  }

  /**
   * GET /api/v1/registers - 获取设备寄存器列表
   * @param {Request} req - query: { projectId, deviceName }
   * @param {Response} res
   */
  async getRegisters(req, res) {
    try {
      const { projectId, deviceName } = request_handler.httpGetData(req);
      const registers = getService(projectId).getRegisters(deviceName);
      res.sendOk(registers);
    } catch (err) {
      res.sendErr(err.errorCode || 500, err.message);
    }
  }
}

module.exports = new DeviceController();
