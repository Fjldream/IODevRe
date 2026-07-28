const { request_handler } = require('../../core/utils');
const DriverService = require('../services/DriverService');
const svc = () => new DriverService();

class DriverController {
  async getDrivers(req, res) { try { res.sendOk(svc().getDrivers(req.query.sysPlatform)); } catch (e) { res.sendErr(500, e.message); } }
  async installDriver(req, res) { try { const d = request_handler.httpPostData(req); res.sendOk(svc().installDriver(req.file, d)); } catch (e) { res.sendErr(500, e.message); } }
  async uninstallDriver(req, res) { try { const { driverName, driverVersion } = request_handler.httpDeleteData(req); res.sendOk(svc().uninstallDriver(driverName, driverVersion)); } catch (e) { res.sendErr(500, e.message); } }
  async getDriverProperty(req, res) { try { res.sendOk(svc().getDriverProperty(req.query.driverName)); } catch (e) { res.sendErr(500, e.message); } }
  async getPointMaps(req, res) { try { res.sendOk(svc().getPointMappingFiles(req.query)); } catch (e) { res.sendErr(500, e.message); } }
  async uploadPointMap(req, res) { try { const d = request_handler.httpPostData(req); res.sendOk(svc().uploadPointMapping(req.file, d)); } catch (e) { res.sendErr(500, e.message); } }
  async delPointMap(req, res) { try { const { fileName, ...info } = request_handler.httpDeleteData(req); res.sendOk(svc().delPointMapping(fileName, info)); } catch (e) { res.sendErr(500, e.message); } }
}
module.exports = new DriverController();
