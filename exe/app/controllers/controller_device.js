/**
 * controller_device.js — 设备管理 HTTP 控制器
 * @module app/controllers/controller_device
 */
const path = require('path'); const { request_handler } = require('../../core/utils');
const DeviceService = require('../services/DeviceService');
function svc(pid) { return new DeviceService(path.join(global.sdbPath, pid)); }

class DeviceController {
  async getGroups(req, res) { try { res.sendOk(svc(req.query.projectId).getDeviceGroupTree()); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async createGroup(req, res) { try { var _a = request_handler.httpPostData(req), projectId = _a.projectId, d = Object.assign({}, _a); delete d.projectId; res.sendOk(svc(projectId).createDeviceGroup(d)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async editGroup(req, res) { try { var _a = request_handler.httpPutData(req), projectId = _a.projectId, groupId = _a.groupId, d = Object.assign({}, _a); delete d.projectId; delete d.groupId; res.sendOk(svc(projectId).editDeviceGroup(groupId, d)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async deleteGroup(req, res) { try { var _a = request_handler.httpDeleteData(req); res.sendOk(svc(_a.projectId).deleteDeviceGroup(_a.groupId)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async getDevices(req, res) { try { res.sendOk(svc(req.query.projectId).getDevices(req.query.groupName||null)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async createDevice(req, res) { try { var _a = request_handler.httpPostData(req), projectId = _a.projectId, d = Object.assign({}, _a); delete d.projectId; res.sendOk(svc(projectId).createDevice(d)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async editDevice(req, res) { try { var _a = request_handler.httpPutData(req), projectId = _a.projectId, deviceId = _a.deviceId, d = Object.assign({}, _a); delete d.projectId; delete d.deviceId; res.sendOk(svc(projectId).editDevice(deviceId, d)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async deleteDevice(req, res) { try { var _a = request_handler.httpDeleteData(req), ids = Array.isArray(_a.deviceIds) ? _a.deviceIds : [_a.deviceIds]; res.sendOk(svc(_a.projectId).deleteDevices(ids)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async moveDevice(req, res) { try { var _a = request_handler.httpPostData(req); res.sendOk(svc(_a.projectId).moveDevices(_a.deviceIds, _a.targetDeviceGroupId)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async getProperty(req, res) { try { res.sendOk(svc(req.query.projectId).getDeviceProperty(req.query.deviceId)); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async importDevices(req, res) { try { var m = require('multer'); m({ storage: m.memoryStorage(), limits: { fileSize: 50*1024*1024 } }).array('devicesFile', 1)(req, res, async function(err) { if (err) return res.sendErr(400, err.message); var _a = req.body, projectId = _a.projectId, groupName = _a.groupName, file = req.files?.[0]; if (!file) return res.sendErr(400, '请上传文件'); var data = file.originalname.endsWith('.json') ? JSON.parse(file.buffer.toString()) : await require('csvtojson')().fromString(file.buffer.toString()); if (groupName) data = data.map(function(d) { d.DeviceGroup = groupName; return d; }); res.sendOk(svc(projectId).createDevicesBatch(data)); }); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
  async exportDevices(req, res) { try { var _a = request_handler.httpPostData(req), devs = svc(_a.projectId).getDevices().filter(function(d) { return _a.deviceNames.includes(d.DeviceName); }); if (_a.fileType === 'csv' && devs.length > 0) { var P = require('json2csv').Parser; res.setHeader('Content-Type','text/csv; charset=utf-8'); return res.send(new P({ fields: Object.keys(devs[0]) }).parse(devs)); } res.sendOk(devs); } catch (e) { res.sendErr(e.errorCode||500, e.message); } }
}
module.exports = new DeviceController();
