const fs = require('fs'), path = require('path');
const Driver = require('../models/Driver');
const AppError = require('../../i18n/AppError'), EC = require('../../i18n/errorCodes');

class DriverService {
  constructor() { this.driverDir = path.join(global.__DIR, 'Driver'); this.infoPath = path.join(this.driverDir, 'DriverInfo.json'); }

  _readDrivers() {
    if (!fs.existsSync(this.infoPath)) return [];
    try { const d = JSON.parse(fs.readFileSync(this.infoPath, 'utf8')); return d.DriverList || d || []; }
    catch (e) { throw new AppError(EC.FILE_READ_ERROR, e.message); }
  }
  _writeDrivers(list) {
    try { fs.writeFileSync(this.infoPath, JSON.stringify({ DriverList: list }, null, '\t'), 'utf8'); }
    catch (e) { throw new AppError(EC.FILE_WRITE_ERROR, e.message); }
  }

  getDrivers(sysPlatform) {
    let list = this._readDrivers();
    if (sysPlatform) list = list.filter(d => d.SystemPlatform === sysPlatform);
    return list;
  }

  installDriver(file, info) {
    const drivers = this._readDrivers();
    if (drivers.some(d => d.DriverName === info.DriverName && d.DriverVersion === info.DriverVersion))
      throw new AppError(EC.DRIVER_ALREADY_EXISTS);
    const d = Driver.create({ ...info, DriverPath: path.join(this.driverDir, info.DriverName), InstallTime: new Date().toISOString() }).toJSON();
    // 解压安装包到 Driver 目录
    const dest = path.join(this.driverDir, info.DriverName);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    if (file && file.path) { /* copy/unzip logic — platform specific */ }
    drivers.push(d);
    this._writeDrivers(drivers);
    return d;
  }

  uninstallDriver(driverName, driverVersion) {
    const drivers = this._readDrivers();
    const d = drivers.find(dd => dd.DriverName === driverName && dd.DriverVersion === driverVersion);
    if (!d) throw new AppError(EC.DRIVER_NOT_FOUND);
    this._writeDrivers(drivers.filter(dd => !(dd.DriverName === driverName && dd.DriverVersion === driverVersion)));
    return true;
  }

  getDriverProperty(driverName) {
    const d = this._readDrivers().find(dd => dd.DriverName === driverName);
    if (!d) throw new AppError(EC.DRIVER_NOT_FOUND);
    return d;
  }

  getPointMappingFiles(params) {
    const dir = path.join(this.driverDir, params.DriverName || '', 'pointMap');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.csv'));
  }

  uploadPointMapping(file, info) {
    const dir = path.join(this.driverDir, info.DriverName || '', 'pointMap');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, file.originalname), file.buffer || fs.readFileSync(file.path));
    return true;
  }

  delPointMapping(fileName, info) {
    const fp = path.join(this.driverDir, info.DriverName || '', 'pointMap', fileName);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    return true;
  }
}

module.exports = DriverService;
