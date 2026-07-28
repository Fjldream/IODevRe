/**
 * adapter_device.js — /ProjectDev/* 兼容适配器
 * 每个 handler: 提取旧格式参数 → new DeviceService → 返回旧 JSON 格式
 * @module compat/adapters/adapter_device
 */
const express = require('express'), path = require('path');
const DeviceService = require('../../app/services/DeviceService');
function svc(pid) { return new DeviceService(path.join(global.sdbPath, pid)); }

module.exports = function () {
  var r = express.Router();

  r.post('/getProjectDeviceGroupTreeView', function(req, res) { try { res.send(svc(req.body.projectId||req.query.ProjectID).getDeviceGroupTree()); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/getDeviceGroupAvailableMove', function(req, res) { try { res.send(svc(req.body.projectId||req.query.ProjectID).getDeviceGroupTree()); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/submitAddDeviceGroup', function(req, res) { try { var _a = req.body; res.send({Error:false, data: svc(_a.projectId||req.query.ProjectID).createDeviceGroup({DeviceGroupName:_a.groupName, ParentID:_a.groupId||''})}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/editDeviceGroup', function(req, res) { try { var _a = req.body; svc(_a.projectId||req.query.ProjectID).editDeviceGroup(_a.groupId||req.query.DeviceGroupID, {DeviceGroupName:_a.groupName||_a.code==='GroupName'?_a.value:''}); res.send({Error:false}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/deleteDeviceGroup', function(req, res) { try { svc(req.body.projectId||req.query.ProjectID).deleteDeviceGroup(req.body.groupId||req.query.GroupID); res.send({Error:false}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/getCollectDeviceProperty', function(req, res) { try { var _a = req.body, devs = svc(_a.projectId||req.query.ProjectID).getDevices(_a.DeviceGroup||null); res.send({total:devs.length, rows:devs}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/getDeviceProperty', function(req, res) { try { res.send(svc(req.body.projectId||req.query.ProjectID).getDeviceProperty(req.body.deviceId)); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/getAllDriverList', function(req, res) { try { var fp = path.join(global.__DIR, 'Driver', 'DriverInfo.json'); if (!require('fs').existsSync(fp)) return res.send({rows:[],total:0}); var data = JSON.parse(require('fs').readFileSync(fp,'utf8')); res.send({rows:data.DriverList||data||[], total:(data.DriverList||data).length}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/addNewDevice', async function(req, res) { try { var _a = req.body, projectId = _a.projectId||req.query.ProjectID; delete _a.projectId; res.send({Error:false, data: svc(projectId).createDevice(_a)}); } catch(e) { res.send({Error:true,ErrorDesc:e.message, data:null}); } });
  r.post('/addMultipleNewDevices', function(req, res) { try { var _a = req.body; res.send({Error:false, data: svc(_a.projectId||req.query.ProjectID).createDevicesBatch(_a.deviceList||[])}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/editDevice', async function(req, res) { try { var _a = req.body, projectId = _a.projectId||req.query.ProjectID, deviceId = _a.DeviceID||_a.deviceId; delete _a.projectId; delete _a.DeviceID; delete _a.deviceId; res.send({Error:false, data: svc(projectId).editDevice(deviceId, _a)}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/deleteDevice', function(req, res) { try { var _a = req.body, ids = Array.isArray(_a.deviceIds)?_a.deviceIds:[_a.deviceIds]; svc(_a.projectId||req.query.ProjectID).deleteDevices(ids); res.send({Error:false}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/moveDevice', function(req, res) { try { var _a = req.body; res.send({Error:false, data: svc(_a.projectId||req.query.ProjectID).moveDevices(_a.deviceIds, _a.targetDeviceGroupId)}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/exportDevice', function(req, res) { try { var _a = req.body, devs = svc(_a.projectId||req.query.ProjectID).getDevices().filter(function(d) { return (_a.deviceNames||[]).includes(d.DeviceName); }); if (_a.fileType==='csv' && devs.length>0) { var P = require('json2csv').Parser; return res.send(new P({fields:Object.keys(devs[0])}).parse(devs)); } res.send(devs); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/importDevice', function(req, res) { try { var formidable = require('formidable'); new formidable.IncomingForm().parse(req, async function(err, fields, files) { if (err) return res.send({Error:true,ErrorDesc:err.message}); var projectId = fields.projectId, groupName = fields.groupId, file = files.uploadFile||files.devicesFile, data = []; if (file&&file.name) { if (file.name.endsWith('.json')) data = JSON.parse(require('fs').readFileSync(file.path,'utf8')); else if (file.name.endsWith('.csv')) data = await require('csvtojson')().fromFile(file.path); } if (groupName&&groupName!=='undefined') data = data.map(function(d) { d.DeviceGroup = groupName; return d; }); res.send({Error:false, data: svc(projectId).createDevicesBatch(data)}); }); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/getAllDevice', function(req, res) { try { res.send(svc(req.body.projectId||req.query.ProjectID).getDevices()); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/getLinkProperty', function(req, res) { try { res.send({}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  r.post('/getLinkDevInfo', function(req, res) { try { var _a = req.body; res.send({Error:false, data: svc(_a.projectId).getDevices().filter(function(d) { return d.LinkName===_a.linkName; })}); } catch(e) { res.send({Error:true,ErrorDesc:e.message}); } });
  return r;
};
