/**
 * adapter_device.js — /ProjectDev/* 路径兼容适配器
 *
 * 将旧格式请求转为 DeviceService 调用，返回旧格式 JSON。
 * 对应旧文件: kingioserver/exe/Routes/ProjectDeviceManage.js
 */
const express = require('express');
const path = require('path');
const DeviceService = require('../../app/services/DeviceService');

function svc(projectId) { return new DeviceService(path.join(global.sdbPath, projectId)); }

module.exports = function () {
  const r = express.Router();

  /** POST /ProjectDev/getProjectDeviceGroupTreeView */
  r.post('/getProjectDeviceGroupTreeView', function (req, res) {
    try { res.send(svc(req.body.projectId).buildDeviceGroupTree()); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/getDeviceGroupAvailableMove */
  r.post('/getDeviceGroupAvailableMove', function (req, res) {
    try { res.send(svc(req.body.projectId).getDeviceGroupList()); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/submitAddDeviceGroup */
  r.post('/submitAddDeviceGroup', function (req, res) {
    try {
      const { projectId, groupName, groupId } = req.body;
      const result = svc(projectId).createDeviceGroup({ DeviceGroupName: groupName, ParentID: groupId || '' });
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/editDeviceGroup */
  r.post('/editDeviceGroup', function (req, res) {
    try {
      const { projectId, groupId, groupName } = req.body;
      svc(projectId).editDeviceGroup(groupId, { DeviceGroupName: groupName });
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/deleteDeviceGroup */
  r.post('/deleteDeviceGroup', function (req, res) {
    try {
      svc(req.body.projectId).deleteDeviceGroup(req.body.groupId);
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/getCollectDeviceProperty */
  r.post('/getCollectDeviceProperty', function (req, res) {
    try {
      const { projectId, DeviceGroup } = req.body;
      res.send({ total: 0, rows: svc(projectId).getDevices(DeviceGroup || null) });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/getDeviceProperty */
  r.post('/getDeviceProperty', function (req, res) {
    try { res.send(svc(req.body.projectId).getDeviceProperty(req.body.deviceId)); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/getAllDriverList */
  r.post('/getAllDriverList', function (req, res) {
    try {
      const fp = path.join(global.__DIR, 'Driver', 'DriverInfo.json');
      if (!require('fs').existsSync(fp)) return res.send({ rows: [], total: 0 });
      const data = JSON.parse(require('fs').readFileSync(fp, 'utf8'));
      res.send({ rows: data.DriverList || data || [], total: (data.DriverList || data).length });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/addNewDevice */
  r.post('/addNewDevice', async function (req, res) {
    try {
      const { projectId, ...data } = req.body;
      const result = svc(projectId).createDevice(data);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message, data: null }); }
  });

  /** POST /ProjectDev/addMultipleNewDevices */
  r.post('/addMultipleNewDevices', function (req, res) {
    try {
      const { projectId, deviceList } = req.body;
      res.send({ Error: false, data: svc(projectId).createDevicesBatch(deviceList || []) });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/editDevice */
  r.post('/editDevice', async function (req, res) {
    try {
      const { projectId, DeviceID, ...data } = req.body;
      const result = svc(projectId).editDevice(DeviceID, data);
      res.send({ Error: false, data: result });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/deleteDevice */
  r.post('/deleteDevice', function (req, res) {
    try {
      const { projectId, deviceIds } = req.body;
      svc(projectId).deleteDevices(Array.isArray(deviceIds) ? deviceIds : [deviceIds]);
      res.send({ Error: false });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/moveDevice */
  r.post('/moveDevice', function (req, res) {
    try {
      const { projectId, deviceIds, targetDeviceGroupId } = req.body;
      res.send({ Error: false, data: svc(projectId).moveDevices(deviceIds, targetDeviceGroupId) });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/exportDevice */
  r.post('/exportDevice', function (req, res) {
    try {
      const { projectId, deviceNames, fileType } = req.body;
      const devices = svc(projectId).getDevices().filter(d => deviceNames.includes(d.DeviceName));
      if (fileType === 'csv' && devices.length > 0) {
        const { Parser } = require('json2csv');
        return res.send(new Parser({ fields: Object.keys(devices[0]) }).parse(devices));
      }
      res.send(devices);
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/importDevice */
  r.post('/importDevice', function (req, res) {
    try {
      const formidable = require('formidable');
      new formidable.IncomingForm().parse(req, async (err, fields, files) => {
        if (err) return res.send({ Error: true, ErrorDesc: err.message });
        const { projectId, groupName } = fields;
        const file = files.uploadFile || files.devicesFile;
        let data = [];
        if (file?.name) {
          if (file.name.endsWith('.json')) data = JSON.parse(require('fs').readFileSync(file.path, 'utf8'));
          else if (file.name.endsWith('.csv')) data = await require('csvtojson')().fromFile(file.path);
        }
        if (groupName && groupName !== 'undefined') data = data.map(d => ({ ...d, DeviceGroup: groupName }));
        res.send({ Error: false, data: svc(projectId).createDevicesBatch(data) });
      });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/getAllDevice */
  r.post('/getAllDevice', function (req, res) {
    try { res.send(svc(req.body.projectId).getDevices()); }
    catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/getLinkProperty */
  r.post('/getLinkProperty', function (req, res) {
    try { res.send({}); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  /** POST /ProjectDev/getLinkDevInfo */
  r.post('/getLinkDevInfo', function (req, res) {
    try {
      const { projectId, linkName } = req.body;
      res.send({ Error: false, data: svc(projectId).getDevices().filter(d => d.LinkName === linkName) });
    } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); }
  });

  return r;
};
