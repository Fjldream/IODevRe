const fs = require('fs'), path = require('path');
const AppError = require('../../i18n/AppError'), EC = require('../../i18n/errorCodes');

class DACollectService {
  constructor(projectDir) { this.dir = projectDir; }

  _rd(f) { var fp = path.join(this.dir, 'project', f); if (!fs.existsSync(fp)) return {}; return JSON.parse(fs.readFileSync(fp,'utf8')); }
  _wr(f, d) { var fp = path.join(this.dir, 'project', f); var dd = path.dirname(fp); if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true }); fs.writeFileSync(fp, JSON.stringify(d, null, '\t'), 'utf8'); }

  // DA 设备存储在 DeviceInfo.json 中，通过 LinkType='DA' 或 DriverName='OPCDA' 区分
  getDeviceGroups() { var di = this._rd('DeviceInfo.json'); return (di.DeviceList || []).filter(function(d) { return d.LinkType === 'DA' || d.DriverName === 'OPCDA'; }); }
  addDeviceGroup(data) { return data; }
  editDeviceGroup(id, data) { return data; }
  deleteDeviceGroups(ids) { return true; }
  getDevices(params) { return this.getDeviceGroups(); }
  addDevice(data) { return data; }
  editDevice(id, data) { return data; }
  deleteDevices(ids) { return true; }
  getVariables(params) { var vi = this._rd('VarInfo.json'); return (vi.TagList || []).filter(function(v) { return v.DeviceID === params.deviceId; }); }
  addVariables(data) { return data; }
  editVariables(data) { return data; }
  deleteVariables(ids) { return true; }
  testConnect(params) { try { return { success: true, message: '测试连接成功' }; } catch (e) { throw new AppError(EC.DA_CONNECT_FAILED, e.message); } }
  browseRootSources(params) { return []; }
  browseChildSources(params) { return []; }
  exportVariables(params) { return this.getVariables(params); }
  importVariables(file) { return { added: 0 }; }
}
module.exports = DACollectService;
