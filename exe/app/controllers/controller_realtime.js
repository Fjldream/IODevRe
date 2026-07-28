const path = require('path'); const { request_handler } = require('../../core/utils');
const RealtimeDataService = require('../services/RealtimeDataService');
class RealtimeController {
  async batchRealValue(req, res) { try { res.sendOk(new RealtimeDataService(path.join(global.sdbPath, req.query.projectId)).getBatchRealValue(req.body.tagNames||[])); } catch (e) { res.sendErr(500, e.message); } }
  async realtimeVarInfo(req, res) { try { res.sendOk(new RealtimeDataService(path.join(global.sdbPath, req.query.projectId)).getRealtimeVarInfo(req.query.projectName)); } catch (e) { res.sendErr(500, e.message); } }
}
module.exports = new RealtimeController();
