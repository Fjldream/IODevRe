const path = require('path');
const UACollectService = require('../../app/services/UACollectService');
const DACollectService = require('../../app/services/DACollectService');
const RealtimeDataService = require('../../app/services/RealtimeDataService');
const { NetworkService, StorageService, TransService } = require('../../app/services/NetworkService');

module.exports = function (router) {
  // UA
  router.post('/uaConnect', async function (req, res) { try { res.send({ code: 0, message: 'success', data: await new UACollectService(path.join(global.sdbPath, req.body.projectId)).uaConnect(req.body) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/uaDevices', function (req, res) { try { res.send({ code: 0, message: 'success', data: new UACollectService(path.join(global.sdbPath, req.query.projectId)).getDevices() }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.post('/uaDevices', function (req, res) { try { res.send({ code: 0, message: 'success', data: new UACollectService(path.join(global.sdbPath, req.body.projectId)).addDevice(req.body) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.put('/uaEditDevice', function (req, res) { try { res.send({ code: 0, message: 'success', data: new UACollectService(path.join(global.sdbPath, req.body.projectId)).editDevice(req.body.deviceId, req.body) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.delete('/uaDelDevices', function (req, res) { try { new UACollectService(path.join(global.sdbPath, req.body.projectId)).deleteDevices(req.body.deviceIds); res.send({ code: 0, message: 'success', data: [] }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/uaRootSources', function (req, res) { try { res.send({ code: 0, message: 'success', data: new UACollectService(path.join(global.sdbPath, req.query.projectId)).browseRootSources(req.query) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/uaChildSources', function (req, res) { try { res.send({ code: 0, message: 'success', data: new UACollectService(path.join(global.sdbPath, req.query.projectId)).browseChildSources(req.query) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/uaVars', function (req, res) { try { res.send({ code: 0, message: 'success', data: new UACollectService(path.join(global.sdbPath, req.query.projectId)).getVariables(req.query) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  // DA
  router.get('/daDeviceGroups', function (req, res) { try { res.send({ code: 0, message: 'success', data: new DACollectService(path.join(global.sdbPath, req.query.projectId)).getDeviceGroups() }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/daDevices', function (req, res) { try { res.send({ code: 0, message: 'success', data: new DACollectService(path.join(global.sdbPath, req.query.projectId)).getDevices(req.query) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/daVars', function (req, res) { try { res.send({ code: 0, message: 'success', data: new DACollectService(path.join(global.sdbPath, req.query.projectId)).getVariables(req.query) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/daTestConnect', function (req, res) { try { res.send({ code: 0, message: 'success', data: new DACollectService(path.join(global.sdbPath, req.query.projectId)).testConnect(req.query) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/daRootSources', function (req, res) { try { res.send({ code: 0, message: 'success', data: new DACollectService(path.join(global.sdbPath, req.query.projectId)).browseRootSources(req.query) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/daChildSources', function (req, res) { try { res.send({ code: 0, message: 'success', data: new DACollectService(path.join(global.sdbPath, req.query.projectId)).browseChildSources(req.query) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  // Realtime
  router.get('/batchrealvalue', function (req, res) { try { res.send({ code: 0, message: 'success', data: new RealtimeDataService(path.join(global.sdbPath, req.query.projectId)).getBatchRealValue(req.body?.tagNames||[]) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/realtimeVarInfo', function (req, res) { try { res.send({ code: 0, message: 'success', data: new RealtimeDataService(path.join(global.sdbPath, req.query.projectId)).getRealtimeVarInfo(req.query.projectName) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  // Trans/Storage
  router.post('/addTransConfig', function (req, res) { try { res.send({ code: 0, message: 'success', data: new TransService(path.join(global.sdbPath, req.body.projectId)).addConfig(req.body) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.post('/updateTransConfig', function (req, res) { try { res.send({ code: 0, message: 'success', data: new TransService(path.join(global.sdbPath, req.body.projectId)).updateConfig(req.body.transId, req.body) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
  router.get('/getDBAPPpropety', function (req, res) { try { res.send({ code: 0, message: 'success', data: new StorageService(path.join(global.sdbPath, req.query.projectId)).getDBProperty(req.query.dbType) }); } catch (e) { res.send({ code: 500, message: e.message, data: [] }); } });
};
