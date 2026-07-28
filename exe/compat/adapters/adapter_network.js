const express = require('express'), path = require('path');
const { NetworkService, StorageService, TransService } = require('../../app/services/NetworkService');
module.exports = function () {
  const r = express.Router();
  r.post('/getNetWorkProperty', function (req, res) { try { res.send({ rows: new NetworkService(path.join(global.sdbPath, req.body.projectId)).getProperty().CollectChannelList || [] }); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/addProNetWork', function (req, res) { try { res.send('OK'); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/getTransCom', function (req, res) { try { res.send(new TransService(path.join(global.sdbPath, req.body.projectId)).getTypes()); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/getTransDBConfig', function (req, res) { try { res.send(new TransService(path.join(global.sdbPath, req.body.projectId)).getDBConfig()); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/getStorageList', function (req, res) { try { res.send(new StorageService(path.join(global.sdbPath, req.body.projectId)).getList()); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/addStorageConfig', function (req, res) { try { new StorageService(path.join(global.sdbPath, req.body.projectId)).addConfig(req.body); res.send('OK'); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/reduceStroage', function (req, res) { try { new StorageService(path.join(global.sdbPath, req.body.projectId)).deleteConfig(req.body.configID); res.send('OK'); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/queryOneStorage', function (req, res) { try { res.send(new StorageService(path.join(global.sdbPath, req.body.projectId)).getById(req.body.StorageID)); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/editStorageConfig', function (req, res) { try { new StorageService(path.join(global.sdbPath, req.body.projectId)).editConfig(req.body.StorageID, req.body); res.send('OK'); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/queryOneTrans', function (req, res) { try { res.send(new TransService(path.join(global.sdbPath, req.body.projectId)).getById(req.body.StorageID)); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/reduceTrans', function (req, res) { try { new TransService(path.join(global.sdbPath, req.body.projectId)).deleteConfig(req.body.configID); res.send('OK'); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/editTransConfig', function (req, res) { try { new TransService(path.join(global.sdbPath, req.body.projectId)).updateConfig(req.body.StorageID, req.body); res.send('OK'); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  return r;
};
