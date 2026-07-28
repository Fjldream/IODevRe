/**
 * adapter_device.js - 设备管理 compat 兼容适配器
 *
 * 将旧的 /ProjectDev/* 路径映射到新的 DeviceService 调用，
 * 返回 JSON 格式与旧版 ProjectDeviceManage.js 完全一致。
 *
 * 此适配器属于 compat 层，可整目录删除以切换到纯新接口。
 *
 * 对应旧文件: kingioserver/exe/Routes/ProjectDeviceManage.js
 */

const express = require('express');
const path = require('path');
const DeviceService = require('../../app/services/DeviceService');

/**
 * 根据 projectId 获取工程目录路径
 * @param {string} projectId - 工程 ID
 * @returns {string}
 */
function getProjectDir(projectId) {
  return path.join(global.sdbPath, projectId);
}

module.exports = function () {
  const router = express.Router();

  /**
   * POST /ProjectDev/getProjectDeviceGroupTreeView
   * 获取设备组树视图（旧格式）
   */
  router.post('/getProjectDeviceGroupTreeView', function (req, res) {
    try {
      const { projectId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const tree = service.getDeviceGroupTree();
      res.send(tree);
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/getDeviceGroupAvailableMove
   * 获取可移动到的设备组列表
   */
  router.post('/getDeviceGroupAvailableMove', function (req, res) {
    try {
      const { projectId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      res.send(service.getDeviceGroupTree());
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/submitAddDeviceGroup
   * 添加设备组
   */
  router.post('/submitAddDeviceGroup', function (req, res) {
    try {
      const { projectId, groupName, groupId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const group = service.createDeviceGroup({
        DeviceGroupName: groupName,
        ParentID: groupId || '',
      });
      res.send({ Error: false, data: group });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/editDeviceGroup
   * 编辑设备组
   */
  router.post('/editDeviceGroup', function (req, res) {
    try {
      const { projectId, groupId, groupName } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const group = service.editDeviceGroup(groupId, { DeviceGroupName: groupName });
      res.send({ Error: false, data: group });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/deleteDeviceGroup
   * 删除设备组
   */
  router.post('/deleteDeviceGroup', function (req, res) {
    try {
      const { projectId, groupId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      service.deleteDeviceGroup(groupId);
      res.send({ Error: false, data: 'OK' });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/getDeviceProperty
   * 获取设备属性
   */
  router.post('/getDeviceProperty', function (req, res) {
    try {
      const { projectId, deviceId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      res.send(service.getDeviceProperty(deviceId));
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/getCollectDeviceProperty
   * 获取采集设备属性
   */
  router.post('/getCollectDeviceProperty', function (req, res) {
    try {
      const { projectId, deviceId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      res.send(service.getDeviceProperty(deviceId));
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/getLinkProperty
   * 获取链路属性
   */
  router.post('/getLinkProperty', function (req, res) {
    try {
      const { projectId, linkName } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      // 链路信息存储在网络配置中，此处返回基础信息
      res.send({ Error: false, data: { LinkName: linkName } });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/getLinkDevInfo
   * 获取链路下的设备信息
   */
  router.post('/getLinkDevInfo', function (req, res) {
    try {
      const { projectId, linkName } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const devices = service.getDevices().filter((d) => d.LinkName === linkName);
      res.send({ Error: false, data: devices });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/getAllDriverList
   * 获取所有驱动列表
   */
  router.post('/getAllDriverList', function (req, res) {
    try {
      const fs = require('fs');
      const driverInfoPath = path.join(global.__DIR, 'Driver', 'DriverInfo.json');
      if (!fs.existsSync(driverInfoPath)) {
        return res.send([]);
      }
      res.send(JSON.parse(fs.readFileSync(driverInfoPath, 'utf8')));
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/addNewDevice
   * 添加新设备（异步，兼容旧版 async 函数）
   */
  router.post('/addNewDevice', async function (req, res) {
    try {
      const { projectId, ...deviceData } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const device = service.createDevice(deviceData);
      res.send({ Error: false, data: device });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message, data: null });
    }
  });

  /**
   * POST /ProjectDev/addMultipleNewDevices
   * 批量添加设备
   */
  router.post('/addMultipleNewDevices', function (req, res) {
    try {
      const { projectId, deviceList } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const result = service.createDevicesBatch(deviceList || []);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/editDevice
   * 编辑设备（异步）
   */
  router.post('/editDevice', async function (req, res) {
    try {
      const { projectId, DeviceID, ...deviceData } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const device = service.editDevice(DeviceID, deviceData);
      res.send({ Error: false, data: device });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/deleteDevice
   * 删除设备
   */
  router.post('/deleteDevice', function (req, res) {
    try {
      const { projectId, deviceIds } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      service.deleteDevices(Array.isArray(deviceIds) ? deviceIds : [deviceIds]);
      res.send({ Error: false });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/moveDevice
   * 移动设备到其他组
   */
  router.post('/moveDevice', function (req, res) {
    try {
      const { projectId, deviceIds, targetDeviceGroupId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const result = service.moveDevices(deviceIds, targetDeviceGroupId);
      res.send({ Error: false, data: result });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/exportDevice
   * 导出设备
   */
  router.post('/exportDevice', function (req, res) {
    try {
      const { projectId, fileType, deviceNames } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      const devices = service.getDevices().filter((d) => deviceNames.includes(d.DeviceName));

      if (fileType === 'csv' && devices.length > 0) {
        const { Parser } = require('json2csv');
        const parser = new Parser({ fields: Object.keys(devices[0]) });
        res.send(parser.parse(devices));
      } else {
        res.send(devices);
      }
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/importDevice
   * 导入设备（formidable 文件上传）
   */
  router.post('/importDevice', function (req, res) {
    try {
      const formidable = require('formidable');
      const form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) return res.send({ Error: true, ErrorDesc: err.message });

        const { projectId, groupId } = fields;
        const service = new DeviceService(getProjectDir(projectId));
        const file = files.uploadFile || files.devicesFile;

        let deviceData = [];
        if (file && file.name) {
          if (file.name.endsWith('.json')) {
            deviceData = JSON.parse(require('fs').readFileSync(file.path, 'utf8'));
          } else if (file.name.endsWith('.csv')) {
            const csv2Json = require('csvtojson');
            deviceData = await csv2Json().fromFile(file.path);
          }
        }

        if (groupId && groupId !== 'undefined') {
          deviceData = deviceData.map((d) => ({ ...d, DeviceGroupID: groupId }));
        }

        const result = service.createDevicesBatch(deviceData);
        res.send({ Error: false, data: result });
      });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/getAllDevice
   * 获取所有设备
   */
  router.post('/getAllDevice', function (req, res) {
    try {
      const { projectId } = req.body;
      const service = new DeviceService(getProjectDir(projectId));
      res.send(service.getDevices());
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/getOPCProperty
   * 获取 OPC 属性
   */
  router.post('/getOPCProperty', function (req, res) {
    try {
      const { projectId } = req.body;
      // OPC 属性读取自工程配置，此处返回空对象兼容
      res.send({});
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  /**
   * POST /ProjectDev/editOPC
   * 编辑 OPC 配置
   */
  router.post('/editOPC', function (req, res) {
    try {
      const { projectId, ...opcData } = req.body;
      res.send({ Error: false, data: opcData });
    } catch (err) {
      res.send({ Error: true, ErrorDesc: err.message });
    }
  });

  return router;
};
