const fs = require('fs'), path = require('path');
const AppError = require('../../i18n/AppError'), EC = require('../../i18n/errorCodes');

class UACollectService {
  constructor(projectDir) { this.dir = projectDir; }

  _di() { var fp = path.join(this.dir, 'project', 'DeviceInfo.json'); if (!fs.existsSync(fp)) return { DeviceList: [] }; return JSON.parse(fs.readFileSync(fp,'utf8')); }
  _vi() { var fp = path.join(this.dir, 'project', 'VarInfo.json'); if (!fs.existsSync(fp)) return { TagList: [] }; return JSON.parse(fs.readFileSync(fp,'utf8')); }
  _wdi(list) { var fp = path.join(this.dir, 'project', 'DeviceInfo.json'); var d = path.dirname(fp); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(fp, JSON.stringify({ DeviceList: list }, null, '\t'), 'utf8'); }
  _wvi(obj) { var fp = path.join(this.dir, 'project', 'VarInfo.json'); fs.writeFileSync(fp, JSON.stringify(obj, null, '\t'), 'utf8'); }

  /**
   * UA 连接测试 — 委托旧 OpcUaConfig 类执行实际 OPC UA Client 操作
   */
  async uaConnect(config) {
    try {
      var OpcUaConfig = require('../../Routes/OpcUaConfig');
      var client = new OpcUaConfig(config);
      await client.connect();
      await client.disconnect();
      return { success: true, message: '测试连接成功' };
    } catch (e) { throw new AppError(EC.UA_CONNECT_FAILED, e.message); }
  }

  getDevices() { return this._di().DeviceList.filter(function(d) { return d.DriverName === 'OPCUA' || d.LinkType === 'OPCUA'; }); }

  addDevice(data) {
    var info = this._di(); var devices = info.DeviceList || [];
    data.DeviceID = data.DeviceID || require('uuid').v1(); data.DriverName = data.DriverName || 'OPCUA';
    devices.push(data); this._wdi(devices); return data;
  }

  editDevice(id, data) {
    var info = this._di(); var devices = info.DeviceList || [];
    var idx = devices.findIndex(function(d) { return d.DeviceID === id; });
    if (idx === -1) throw new AppError(EC.UA_DEVICE_NOT_FOUND);
    devices[idx] = Object.assign({}, devices[idx], data); this._wdi(devices); return devices[idx];
  }

  deleteDevices(ids) {
    var info = this._di(); var devices = (info.DeviceList || []).filter(function(d) { return !ids.includes(d.DeviceID); });
    this._wdi(devices);
    var vi = this._vi(); vi.TagList = (vi.TagList || []).filter(function(v) { return !ids.includes(v.DeviceID); }); this._wvi(vi);
    return true;
  }

  /** OPC UA 浏览根节点 */
  async browseRootSources(params) {
    try {
      var OpcUaConfig = require('../../Routes/OpcUaConfig');
      var devices = this.getDevices(); var device = devices.find(function(d) { return d.DeviceID === params.deviceId; });
      if (!device) throw new AppError(EC.UA_DEVICE_NOT_FOUND);
      var client = new OpcUaConfig({ endpointUrl: device.DevAddress, securityMode: 'None', securityPolicy: 'None' });
      await client.connect(); var result = await client.browse('RootFolder'); await client.disconnect(); return result;
    } catch (e) { throw new AppError(EC.UA_SOURCE_BROWSE_FAILED, e.message); }
  }

  async browseChildSources(params) {
    try {
      var OpcUaConfig = require('../../Routes/OpcUaConfig');
      var devices = this.getDevices(); var device = devices.find(function(d) { return d.DeviceID === params.deviceId; });
      if (!device) throw new AppError(EC.UA_DEVICE_NOT_FOUND);
      var client = new OpcUaConfig({ endpointUrl: device.DevAddress });
      await client.connect(); var result = await client.browse(params.nodeId); await client.disconnect(); return result;
    } catch (e) { throw new AppError(EC.UA_SOURCE_BROWSE_FAILED, e.message); }
  }

  getVariables(params) { return this._vi().TagList.filter(function(v) { return v.DeviceID === params.deviceId; }); }
  addVariables(data) { var vi = this._vi(); vi.TagList = vi.TagList || []; vi.TagList.push(data); this._wvi(vi); return data; }
  editVariables(data) { return data; }
  deleteVariables(ids) { var vi = this._vi(); vi.TagList = (vi.TagList || []).filter(function(v) { return !ids.includes(v.TagID); }); this._wvi(vi); return true; }
  exportVariables(params) { return this.getVariables(params); }
  importVariables(file) { return { added: 0 }; }
}
module.exports = UACollectService;
