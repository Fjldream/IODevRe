const path = require('path');
const { request_handler } = require('../../core/utils');
const UACollectService = require('../services/UACollectService');
function svc(pid) { return new UACollectService(path.join(global.sdbPath, pid)); }

class UACollectController {
  async connect(req, res) { try { res.sendOk(svc(req.query.projectId).uaConnect(req.body)); } catch (e) { res.sendErr(500, e.message); } }
  async getDevices(req, res) { try { res.sendOk(svc(req.query.projectId).getDevices()); } catch (e) { res.sendErr(500, e.message); } }
  async addDevice(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId).addDevice(d)); } catch (e) { res.sendErr(500, e.message); } }
  async editDevice(req, res) { try { const { projectId, deviceId, ...d } = request_handler.httpPutData(req); res.sendOk(svc(projectId).editDevice(deviceId, d)); } catch (e) { res.sendErr(500, e.message); } }
  async deleteDevices(req, res) { try { const { projectId, deviceIds } = request_handler.httpDeleteData(req); res.sendOk(svc(projectId).deleteDevices(deviceIds)); } catch (e) { res.sendErr(500, e.message); } }
  async browseRoot(req, res) { try { res.sendOk(svc(req.query.projectId).browseRootSources(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async browseChild(req, res) { try { res.sendOk(svc(req.query.projectId).browseChildSources(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async getVars(req, res) { try { res.sendOk(svc(req.query.projectId).getVariables(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async addVars(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId).addVariables(d)); } catch (e) { res.sendErr(500, e.message); } }
  async editVars(req, res) { try { const { projectId, ...d } = request_handler.httpPutData(req); res.sendOk(svc(projectId).editVariables(d)); } catch (e) { res.sendErr(500, e.message); } }
  async deleteVars(req, res) { try { const { projectId, varIds } = request_handler.httpDeleteData(req); res.sendOk(svc(projectId).deleteVariables(varIds)); } catch (e) { res.sendErr(500, e.message); } }
  async exportVars(req, res) { try { res.sendOk(svc(req.query.projectId).exportVariables(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async importVars(req, res) { try { res.sendOk(svc(req.query.projectId).importVariables(req.file)); } catch (e) { res.sendErr(500, e.message); } }
}
module.exports = new UACollectController();
