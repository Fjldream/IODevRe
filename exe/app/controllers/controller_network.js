const path = require('path');
const { request_handler } = require('../../core/utils');
const { NetworkService, StorageService, TransService } = require('../services/NetworkService');
function svc(pid, Cls) { return new Cls(path.join(global.sdbPath, pid)); }

class NetworkController {
  async getProperty(req, res) { try { res.sendOk(svc(req.query.projectId, NetworkService).getProperty()); } catch (e) { res.sendErr(500, e.message); } }
  async addConfig(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId, NetworkService).addConfig(d)); } catch (e) { res.sendErr(500, e.message); } }
  async getStorageList(req, res) { try { res.sendOk(svc(req.query.projectId, StorageService).getList()); } catch (e) { res.sendErr(500, e.message); } }
  async addStorage(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId, StorageService).addConfig(d)); } catch (e) { res.sendErr(500, e.message); } }
  async editStorage(req, res) { try { const { projectId, storageId, ...d } = request_handler.httpPutData(req); res.sendOk(svc(projectId, StorageService).editConfig(storageId, d)); } catch (e) { res.sendErr(500, e.message); } }
  async deleteStorage(req, res) { try { const { projectId, storageIds } = request_handler.httpDeleteData(req); res.sendOk(svc(projectId, StorageService).deleteConfig(storageIds)); } catch (e) { res.sendErr(500, e.message); } }
  async getTransTypes(req, res) { try { res.sendOk(svc(req.query.projectId, TransService).getTypes()); } catch (e) { res.sendErr(500, e.message); } }
  async getTransList(req, res) { try { res.sendOk(svc(req.query.projectId, TransService).getDBConfig()); } catch (e) { res.sendErr(500, e.message); } }
  async addTrans(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId, TransService).addConfig(d)); } catch (e) { res.sendErr(500, e.message); } }
  async editTrans(req, res) { try { const { projectId, transId, ...d } = request_handler.httpPutData(req); res.sendOk(svc(projectId, TransService).updateConfig(transId, d)); } catch (e) { res.sendErr(500, e.message); } }
  async deleteTrans(req, res) { try { const { projectId, transIds } = request_handler.httpDeleteData(req); res.sendOk(svc(projectId, TransService).deleteConfig(transIds)); } catch (e) { res.sendErr(500, e.message); } }
  async getDBProperty(req, res) { try { res.sendOk(svc(req.query.projectId, StorageService).getDBProperty(req.query.dbType)); } catch (e) { res.sendErr(500, e.message); } }
}
module.exports = new NetworkController();
