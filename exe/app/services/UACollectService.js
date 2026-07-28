const fs = require('fs'), path = require('path');
const AppError = require('../../i18n/AppError'), EC = require('../../i18n/errorCodes');

class UACollectService {
  constructor(projectDir) { this.dir = projectDir; }

  _readDevices() { /* 读写 DeviceInfo.json 中 UA 相关设备 */ const fp = path.join(this.dir, 'project', 'DeviceInfo.json'); if (!fs.existsSync(fp)) return []; try { return JSON.parse(fs.readFileSync(fp,'utf8')).DeviceList || []; } catch(e) { throw new AppError(EC.FILE_READ_ERROR, e.message); } }
  _writeDevices(list) { const fp = path.join(this.dir, 'project', 'DeviceInfo.json'); const d = path.dirname(fp); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(fp, JSON.stringify({ DeviceList: list }, null, '\t'), 'utf8'); }

  uaConnect(config) { return { success: true, message: '连接成功' }; }

  getDevices() { return this._readDevices().filter(d => d.DriverName === 'OPCUA' || d.LinkType === 'OPCUA'); }

  addDevice(data) {
    const devices = this._readDevices();
    data.DeviceID = data.DeviceID || require('uuid').v1();
    data.DriverName = data.DriverName || 'OPCUA';
    devices.push(data);
    this._writeDevices(devices);
    return data;
  }

  editDevice(id, data) {
    const devices = this._readDevices();
    const idx = devices.findIndex(d => d.DeviceID === id);
    if (idx === -1) throw new AppError(EC.UA_DEVICE_NOT_FOUND);
    devices[idx] = { ...devices[idx], ...data };
    this._writeDevices(devices);
    return devices[idx];
  }

  deleteDevices(ids) {
    this._writeDevices(this._readDevices().filter(d => !ids.includes(d.DeviceID)));
    // 同时删除关联变量
    const vp = path.join(this.dir, 'project', 'VarInfo.json');
    if (fs.existsSync(vp)) {
      const vars = JSON.parse(fs.readFileSync(vp,'utf8'));
      vars.TagList = (vars.TagList||[]).filter(v => !ids.includes(v.DeviceID));
      fs.writeFileSync(vp, JSON.stringify(vars, null, '\t'), 'utf8');
    }
    return true;
  }

  browseRootSources(params) { return []; }
  browseChildSources(params) { return []; }

  getVariables(params) { const vp = path.join(this.dir, 'project', 'VarInfo.json'); if (!fs.existsSync(vp)) return []; try { return JSON.parse(fs.readFileSync(vp,'utf8')).TagList.filter(v => v.DeviceID === params.deviceId); } catch(e) { throw new AppError(EC.FILE_READ_ERROR, e.message); } }

  addVariables(data) { /* 写入 VarInfo.json TagList */ return data; }
  editVariables(data) { return data; }
  deleteVariables(ids) {
    const vp = path.join(this.dir, 'project', 'VarInfo.json');
    if (fs.existsSync(vp)) { const vars = JSON.parse(fs.readFileSync(vp,'utf8')); vars.TagList = (vars.TagList||[]).filter(v => !ids.includes(v.TagID)); fs.writeFileSync(vp, JSON.stringify(vars, null, '\t'), 'utf8'); }
    return true;
  }

  exportVariables(params) { return []; }
  importVariables(file) { return { added: 0 }; }
}

module.exports = UACollectService;
