const path = require('path'); const { request_handler } = require('../../core/utils');
const DACollectService = require('../services/DACollectService');
function svc(pid) { return new DACollectService(path.join(global.sdbPath, pid)); }
class DACollectController {
  async getGroups(req, res) { try { res.sendOk(svc(req.query.projectId).getDeviceGroups()); } catch (e) { res.sendErr(500, e.message); } }
  async addGroup(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId).addDeviceGroup(d)); } catch (e) { res.sendErr(500, e.message); } }
  async editGroup(req, res) { try { const { projectId, groupId, ...d } = request_handler.httpPutData(req); res.sendOk(svc(projectId).editDeviceGroup(groupId, d)); } catch (e) { res.sendErr(500, e.message); } }
  async deleteGroups(req, res) { try { const { projectId, ids } = request_handler.httpDeleteData(req); res.sendOk(svc(projectId).deleteDeviceGroups(ids)); } catch (e) { res.sendErr(500, e.message); } }
  async getDevices(req, res) { try { res.sendOk(svc(req.query.projectId).getDevices(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async addDevice(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId).addDevice(d)); } catch (e) { res.sendErr(500, e.message); } }
  async editDevice(req, res) { try { const { projectId, deviceId, ...d } = request_handler.httpPutData(req); res.sendOk(svc(projectId).editDevice(deviceId, d)); } catch (e) { res.sendErr(500, e.message); } }
  async deleteDevices(req, res) { try { const { projectId, ids } = request_handler.httpDeleteData(req); res.sendOk(svc(projectId).deleteDevices(ids)); } catch (e) { res.sendErr(500, e.message); } }
  async getVars(req, res) { try { res.sendOk(svc(req.query.projectId).getVariables(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async addVars(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId).addVariables(d)); } catch (e) { res.sendErr(500, e.message); } }
  async editVars(req, res) { try { const { projectId, ...d } = request_handler.httpPutData(req); res.sendOk(svc(projectId).editVariables(d)); } catch (e) { res.sendErr(500, e.message); } }
  async deleteVars(req, res) { try { const { projectId, ids } = request_handler.httpDeleteData(req); res.sendOk(svc(projectId).deleteVariables(ids)); } catch (e) { res.sendErr(500, e.message); } }
  async testConnect(req, res) { try { res.sendOk(svc(req.query.projectId).testConnect(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async browseRoot(req, res) { try { res.sendOk(svc(req.query.projectId).browseRootSources(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async browseChild(req, res) { try { res.sendOk(svc(req.query.projectId).browseChildSources(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async exportVars(req, res) { try { res.sendOk(svc(req.query.projectId).exportVariables(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async importVars(req, res) { try { res.sendOk(svc(req.query.projectId).importVariables(req.file)); } catch (e) { res.sendErr(500, e.message); } }
}
module.exports = new DACollectController();
