const fs = require('fs'), path = require('path');
const AppError = require('../../i18n/AppError'), EC = require('../../i18n/errorCodes');

class DACollectService {
  constructor(projectDir) { this.dir = projectDir; }
  _rd(f, fb) { const fp = path.join(this.dir, 'project', f); if (!fs.existsSync(fp)) return fb; return JSON.parse(fs.readFileSync(fp,'utf8')); }
  _wr(f, d) { const fp = path.join(this.dir, 'project', f); const dd = path.dirname(fp); if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true }); fs.writeFileSync(fp, JSON.stringify(d, null, '\t'), 'utf8'); }

  getDeviceGroups() { return this._rd('DeviceInfo.json', { DeviceList: [] }).DeviceList.filter(d => d.LinkType === 'DA' || d.DriverName === 'OPCDA'); }
  addDeviceGroup(data) { return data; }
  editDeviceGroup(id, data) { return data; }
  deleteDeviceGroups(ids) { return true; }
  getDevices(params) { return []; }
  addDevice(data) { return data; }
  editDevice(id, data) { return data; }
  deleteDevices(ids) { return true; }
  getVariables(params) { return []; }
  addVariables(data) { return data; }
  editVariables(data) { return data; }
  deleteVariables(ids) { return true; }
  testConnect(params) { return { success: true }; }
  browseRootSources(params) { return []; }
  browseChildSources(params) { return []; }
  exportVariables(params) { return []; }
  importVariables(file) { return { added: 0 }; }
}
module.exports = DACollectService;
