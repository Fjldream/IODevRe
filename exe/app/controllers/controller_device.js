/**
 * controller_device.js — 设备管理 HTTP 控制器
 *
 * 遵循 lib/controllers/controller_project.js 模式。
 * @module app/controllers/controller_device
 */
const path = require('path');
const { request_handler } = require('../../core/utils');
const DeviceService = require('../services/DeviceService');

/** @param {string} projectId @returns {string} */
function dir(projectId) { return path.join(global.sdbPath, projectId); }
/** @param {string} projectId @returns {DeviceService} */
function svc(projectId) { return new DeviceService(dir(projectId)); }

class DeviceController {
  // ---- 设备组 ----

  /** GET /api/v1/deviceGroups */
  async getDeviceGroups(req, res) {
    try { res.sendOk(svc(req.query.projectId).buildDeviceGroupTree()); }
    catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** POST /api/v1/deviceGroups */
  async createDeviceGroup(req, res) {
    try {
      const { projectId, ...data } = request_handler.httpPostData(req);
      res.sendOk(svc(projectId).createDeviceGroup(data));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** PUT /api/v1/deviceGroups */
  async editDeviceGroup(req, res) {
    try {
      const { projectId, groupId, ...data } = request_handler.httpPutData(req);
      res.sendOk(svc(projectId).editDeviceGroup(groupId, data));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** DELETE /api/v1/deviceGroups */
  async deleteDeviceGroup(req, res) {
    try {
      const { projectId, groupId } = request_handler.httpDeleteData(req);
      res.sendOk(svc(projectId).deleteDeviceGroup(groupId));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  // ---- 设备 ----

  /** GET /api/v1/devices */
  async getDevices(req, res) {
    try {
      const { projectId, groupName } = request_handler.httpGetData(req);
      res.sendOk(svc(projectId).getDevices(groupName || null));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** POST /api/v1/devices */
  async createDevice(req, res) {
    try {
      const { projectId, ...data } = request_handler.httpPostData(req);
      res.sendOk(svc(projectId).createDevice(data));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** PUT /api/v1/devices */
  async editDevice(req, res) {
    try {
      const { projectId, deviceId, ...data } = request_handler.httpPutData(req);
      res.sendOk(svc(projectId).editDevice(deviceId, data));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** DELETE /api/v1/devices */
  async deleteDevice(req, res) {
    try {
      const { projectId, deviceIds } = request_handler.httpDeleteData(req);
      res.sendOk(svc(projectId).deleteDevices(Array.isArray(deviceIds) ? deviceIds : [deviceIds]));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** POST /api/v1/moveDevice */
  async moveDevice(req, res) {
    try {
      const { projectId, deviceIds, targetDeviceGroupName } = request_handler.httpPostData(req);
      res.sendOk(svc(projectId).moveDevices(deviceIds, targetDeviceGroupName));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** GET /api/v1/deviceProperty */
  async getDeviceProperty(req, res) {
    try {
      const { projectId, deviceId } = request_handler.httpGetData(req);
      res.sendOk(svc(projectId).getDeviceProperty(deviceId));
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** POST /api/v1/importDevices */
  async importDevices(req, res) {
    try {
      const multer = require('multer');
      multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })
        .array('devicesFile', 1)(req, res, async (err) => {
          if (err) return res.sendErr(400, err.message);
          const { projectId, groupName } = req.body;
          const file = req.files?.[0];
          if (!file) return res.sendErr(400, '请上传文件');
          let data = [];
          if (file.originalname.endsWith('.json')) data = JSON.parse(file.buffer.toString());
          else if (file.originalname.endsWith('.csv')) data = await require('csvtojson')().fromString(file.buffer.toString());
          if (groupName) data = data.map(d => ({ ...d, DeviceGroup: groupName }));
          res.sendOk(svc(projectId).createDevicesBatch(data));
        });
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }

  /** POST /api/v1/exportDevices */
  async exportDevices(req, res) {
    try {
      const { projectId, deviceNames, fileType } = request_handler.httpPostData(req);
      const devices = svc(projectId).getDevices().filter(d => deviceNames.includes(d.DeviceName));
      if (fileType === 'csv' && devices.length > 0) {
        const { Parser } = require('json2csv');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.send(new Parser({ fields: Object.keys(devices[0]) }).parse(devices));
      }
      res.sendOk(devices);
    } catch (e) { res.sendErr(e.errorCode || 500, e.message); }
  }
}

module.exports = new DeviceController();
