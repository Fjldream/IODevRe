const express = require('express'), path = require('path');
const DriverService = require('../../app/services/DriverService');
module.exports = function () {
  const r = express.Router();
  const svc = () => new DriverService();

  r.post('/getDriverConfig', function (req, res) { try { res.send(svc().getDriverProperty(req.body.driverName)); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/getAllDriverList', function (req, res) { try { res.send({ rows: svc().getDrivers(), total: svc().getDrivers().length, Error: false }); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/driverInstall', function (req, res) { try { res.send({ Error: false, data: svc().installDriver(req.files?.driverFile, req.body) }); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  r.post('/driverUninstall', function (req, res) { try { res.send({ Error: false, data: svc().uninstallDriver(req.body.driverName, req.body.driverVersion) }); } catch (e) { res.send({ Error: true, ErrorDesc: e.message }); } });
  return r;
};
