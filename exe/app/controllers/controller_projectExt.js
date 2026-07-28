/**
 * controller_projectExt.js — lib Project 未覆盖的网络/存储/转发入口补全
 */
const path = require('path');
const { request_handler } = require('../../core/utils');
const { NetworkService, StorageService, TransService } = require('../services/NetworkService');
function svc(pid, Cls) { return new Cls(path.join(global.sdbPath, pid)); }

class ProjectExtController {
  async getNetWorkProperty(req, res) { try { res.sendOk(svc(req.query.projectId, NetworkService).getProperty()); } catch (e) { res.sendErr(500, e.message); } }
  async addNetWork(req, res) { try { const { projectId, ...d } = request_handler.httpPostData(req); res.sendOk(svc(projectId, NetworkService).addConfig(d)); } catch (e) { res.sendErr(500, e.message); } }
  async getStorageList(req, res) { try { res.sendOk(svc(req.query.projectId, StorageService).getList()); } catch (e) { res.sendErr(500, e.message); } }
  async getTransList(req, res) { try { res.sendOk(svc(req.query.projectId, TransService).getDBConfig()); } catch (e) { res.sendErr(500, e.message); } }
}
module.exports = new ProjectExtController();
