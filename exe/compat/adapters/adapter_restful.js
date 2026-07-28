const path = require('path');
const UACollectService = require('../../app/services/UACollectService');
const DACollectService = require('../../app/services/DACollectService');
const RealtimeDataService = require('../../app/services/RealtimeDataService');
const { NetworkService, StorageService, TransService } = require('../../app/services/NetworkService');

function uaSvc(pid) { return new UACollectService(path.join(global.sdbPath, pid)); }
function daSvc(pid) { return new DACollectService(path.join(global.sdbPath, pid)); }
function rtSvc(pid) { return new RealtimeDataService(path.join(global.sdbPath, pid)); }
function trSvc(pid) { return new TransService(path.join(global.sdbPath, pid)); }
function stSvc(pid) { return new StorageService(path.join(global.sdbPath, pid)); }
function ok(d) { return { code: 0, message: 'success', data: d }; }
function err(e) { return { code: 500, message: e.message, data: [] }; }

module.exports = function (router) {
  // ===== UA OPC UA =====
  router.post('/uaConnect', async function (req, res) { try { res.send(ok(await uaSvc(req.body.projectId).uaConnect(req.body))); } catch (e) { res.send(err(e)); } });
  router.get('/uaDevices', function (req, res) { try { res.send(ok(uaSvc(req.query.projectId).getDevices())); } catch (e) { res.send(err(e)); } });
  router.post('/uaAddDevice', function (req, res) { try { res.send(ok(uaSvc(req.body.projectId).addDevice(req.body))); } catch (e) { res.send(err(e)); } });
  router.put('/uaEditDevice', function (req, res) { try { res.send(ok(uaSvc(req.body.projectId).editDevice(req.body.deviceId, req.body))); } catch (e) { res.send(err(e)); } });
  router.delete('/uaDelDevices', function (req, res) { try { uaSvc(req.body.projectId).deleteDevices(req.body.deviceIds); res.send(ok([])); } catch (e) { res.send(err(e)); } });
  router.get('/uaRootSources', function (req, res) { try { res.send(ok(uaSvc(req.query.projectId).browseRootSources(req.query))); } catch (e) { res.send(err(e)); } });
  router.get('/uaChildSources', function (req, res) { try { res.send(ok(uaSvc(req.query.projectId).browseChildSources(req.query))); } catch (e) { res.send(err(e)); } });
  router.get('/uaVars', function (req, res) { try { res.send(ok(uaSvc(req.query.projectId).getVariables(req.query))); } catch (e) { res.send(err(e)); } });
  router.post('/uaAddVariables', function (req, res) { try { res.send(ok(uaSvc(req.body.projectId).addVariables(req.body))); } catch (e) { res.send(err(e)); } });
  router.put('/uaEditVariables', function (req, res) { try { res.send(ok(uaSvc(req.body.projectId).editVariables(req.body))); } catch (e) { res.send(err(e)); } });
  router.delete('/uaDelVars', function (req, res) { try { uaSvc(req.body.projectId).deleteVariables(req.body.varIds); res.send(ok([])); } catch (e) { res.send(err(e)); } });
  router.post('/uaExportDevices', function (req, res) { try { res.send(ok(uaSvc(req.body.projectId).getDevices())); } catch (e) { res.send(err(e)); } });
  router.post('/uaImportDevices', function (req, res) { try { res.send(ok(uaSvc(req.body.projectId).addDevice(req.body))); } catch (e) { res.send(err(e)); } });
  router.post('/uaExportVars', function (req, res) { try { res.send(ok(uaSvc(req.body.projectId).exportVariables(req.query))); } catch (e) { res.send(err(e)); } });
  router.post('/uaImportVars', function (req, res) { try { res.send(ok(uaSvc(req.body.projectId).importVariables(req.file))); } catch (e) { res.send(err(e)); } });

  // ===== DA =====
  router.get('/daDeviceGroups', function (req, res) { try { res.send(ok(daSvc(req.query.projectId).getDeviceGroups())); } catch (e) { res.send(err(e)); } });
  router.post('/daAddDeviceGroup', function (req, res) { try { res.send(ok(daSvc(req.body.projectId).addDeviceGroup(req.body))); } catch (e) { res.send(err(e)); } });
  router.put('/daEditDeviceGroup', function (req, res) { try { res.send(ok(daSvc(req.body.projectId).editDeviceGroup(req.body.groupId, req.body))); } catch (e) { res.send(err(e)); } });
  router.delete('/daDelDeviceGroups', function (req, res) { try { daSvc(req.body.projectId).deleteDeviceGroups(req.body.idArr); res.send(ok([])); } catch (e) { res.send(err(e)); } });
  router.get('/daDevices', function (req, res) { try { res.send(ok(daSvc(req.query.projectId).getDevices(req.query))); } catch (e) { res.send(err(e)); } });
  router.post('/daAddDevice', function (req, res) { try { res.send(ok(daSvc(req.body.projectId).addDevice(req.body))); } catch (e) { res.send(err(e)); } });
  router.put('/daEditDevice', function (req, res) { try { res.send(ok(daSvc(req.body.projectId).editDevice(req.body.deviceId, req.body))); } catch (e) { res.send(err(e)); } });
  router.delete('/daDelDevices', function (req, res) { try { daSvc(req.body.projectId).deleteDevices(req.body.idArr); res.send(ok([])); } catch (e) { res.send(err(e)); } });
  router.get('/daVars', function (req, res) { try { res.send(ok(daSvc(req.query.projectId).getVariables(req.query))); } catch (e) { res.send(err(e)); } });
  router.post('/daAddVariables', function (req, res) { try { res.send(ok(daSvc(req.body.projectId).addVariables(req.body))); } catch (e) { res.send(err(e)); } });
  router.put('/daEditVars', function (req, res) { try { res.send(ok(daSvc(req.body.projectId).editVariables(req.body))); } catch (e) { res.send(err(e)); } });
  router.delete('/daDelVars', function (req, res) { try { daSvc(req.body.projectId).deleteVariables(req.body.idArr); res.send(ok([])); } catch (e) { res.send(err(e)); } });
  router.get('/daTestConnect', function (req, res) { try { res.send(ok(daSvc(req.query.projectId).testConnect(req.query))); } catch (e) { res.send(err(e)); } });
  router.get('/daRootSources', function (req, res) { try { res.send(ok(daSvc(req.query.projectId).browseRootSources(req.query))); } catch (e) { res.send(err(e)); } });
  router.get('/daChildSources', function (req, res) { try { res.send(ok(daSvc(req.query.projectId).browseChildSources(req.query))); } catch (e) { res.send(err(e)); } });
  router.post('/daExportVars', function (req, res) { try { res.send(ok(daSvc(req.body.projectId).exportVariables(req.body))); } catch (e) { res.send(err(e)); } });
  router.post('/daImportVars', function (req, res) { try { res.send(ok(daSvc(req.body.projectId).importVariables(req.file))); } catch (e) { res.send(err(e)); } });
  router.get('/daExportDevices', function (req, res) { try { res.send(ok(daSvc(req.query.projectId).getDevices(req.query))); } catch (e) { res.send(err(e)); } });
  router.get('/daImportDevices', function (req, res) { try { res.send(ok(daSvc(req.query.projectId).getDevices(req.query))); } catch (e) { res.send(err(e)); } });
  router.get('/daTagProperty', function (req, res) { try { res.send(ok([])); } catch (e) { res.send(err(e)); } });

  // ===== Realtime =====
  router.get('/batchrealvalue', function (req, res) { try { res.send(ok(rtSvc(req.query.projectId).getBatchRealValue(req.body?.tagNames||[]))); } catch (e) { res.send(err(e)); } });
  router.get('/realtimeVarInfo', function (req, res) { try { res.send(ok(rtSvc(req.query.projectId).getRealtimeVarInfo(req.query.projectName))); } catch (e) { res.send(err(e)); } });

  // ===== Trans/Storage =====
  router.post('/addTransConfig', function (req, res) { try { res.send(ok(trSvc(req.body.projectId).addConfig(req.body))); } catch (e) { res.send(err(e)); } });
  router.post('/updateTransConfig', function (req, res) { try { res.send(ok(trSvc(req.body.projectId).updateConfig(req.body.transId, req.body))); } catch (e) { res.send(err(e)); } });
  router.get('/getDBAPPpropety', function (req, res) { try { res.send(ok(stSvc(req.query.projectId).getDBProperty(req.query.dbType))); } catch (e) { res.send(err(e)); } });
  router.post('/registerdatatypes', function (req, res) { try { res.send(ok([])); } catch (e) { res.send(err(e)); } });
  router.post('/getDataTypeByRegNameFromDriver', function (req, res) { try { res.send(ok([])); } catch (e) { res.send(err(e)); } });

  // ===== Driver =====
  router.post('/updateProDriver', function (req, res) { try { res.send(ok([])); } catch (e) { res.send(err(e)); } });
};
