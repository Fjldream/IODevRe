/**
 * DeviceService — 设备管理全部业务逻辑
 *
 * 读写工程文件: DeviceGroupInfo.json / DeviceInfo.json / CollectChannelInfo.json / VarInfo.json
 * 创建时自动生成系统变量(Status/Control/Frequency) + 自动关联链路
 *
 * @module app/services/DeviceService
 */
const fs = require('fs'); const path = require('path');
const Device = require('../models/Device'); const DeviceGroup = require('../models/DeviceGroup');
const AppError = require('../../i18n/AppError'); const EC = require('../../i18n/errorCodes');

/** 系统变量模板 — 每个设备创建时自动生成 3 个系统变量 */
const SYS_TAG_TPL = {
  TagType: (global.productType == 1) ? 0 : 1, TagDataType: 128, RegDataType: 128, AccessType: 0,
  RegName: null, RegAddress: null, VarPlcInfo: '', CollectTimeInterval: null,
  DataConvertType: null, MaxRawValue: null, MinRawValue: null, MaxValue: null, MinValue: null,
  NonLinearName: '', DataCleaningType: null, DataCleaningUpperLimit: null, DataCleaningLowerLimit: null,
  ChangeRate: null, DeadbandRate: null, AlarmUpperLimit: null, AlarmLowerLimit: null,
};

class DeviceService {
  /** @param {string} projectDir — 工程根目录 (sdbPath/projectId) */
  constructor(projectDir) { this.dir = projectDir; this.proDir = path.join(projectDir, 'project'); }

  // ===== 私有: 文件读写 =====
  _dgi() { return path.join(this.proDir, 'DeviceGroupInfo.json'); }
  _di()  { return path.join(this.proDir, 'DeviceInfo.json'); }
  _chi() { return path.join(this.proDir, 'CollectChannelInfo.json'); }
  _vi()  { return path.join(this.proDir, 'VarInfo.json'); }

  _read(fp, fb) { if (!fs.existsSync(fp)) return fb; try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) { throw new AppError(EC.FILE_READ_ERROR, e.message); } }
  _write(fp, data) { var d = path.dirname(fp); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); try { fs.writeFileSync(fp, JSON.stringify(data, null, '\t'), 'utf8'); } catch (e) { throw new AppError(EC.FILE_WRITE_ERROR, e.message); } }

  _readGroups()  { return this._read(this._dgi(), { DeviceGroupList: [] }).DeviceGroupList; }
  _readDevices() { return this._read(this._di(),  { DeviceList: [] }).DeviceList; }
  _readVarInfo() { return this._read(this._vi(),  { TagList: [] }); }
  _readChannels(){ return this._read(this._chi(), { CollectChannelList: [] }).CollectChannelList; }

  _writeGroups(l)  { this._write(this._dgi(), { DeviceGroupList: l }); }
  _writeDevices(l) { this._write(this._di(),  { DeviceList: l }); }
  _writeVarInfo(o) { this._write(this._vi(),  o); }
  _writeChannels(l){ this._write(this._chi(), { CollectChannelList: l }); }

  /** 生成设备 ID — 取已有最大 DeviceID + 1 */
  _genDeviceId() { var ds = this._readDevices(); var max = 0; ds.forEach(function(d) { var n = parseInt(d.DeviceID, 10); if (n > max) max = n; }); return String(max + 1); }

  // ===== 设备组 =====

  getDeviceGroupTree() {
    var groups = this._readGroups(); var devices = this._readDevices();
    return groups.map(function(g) {
      var children = (g.DeviceObjectList || []).map(function(ref) { var d = devices.find(function(dd) { return dd.DeviceID === ref.DeviceID; }); return d ? Object.assign({}, ref, d) : ref; });
      return Object.assign({}, g, { DeviceObjectList: children });
    });
  }

  createDeviceGroup(data) {
    var v = DeviceGroup.validate(data); var groups = this._readGroups();
    if (groups.some(function(g) { return g.DeviceGroupName === v.DeviceGroupName; })) throw new AppError(EC.DEVICE_GROUP_NAME_EXISTS);
    var g = DeviceGroup.create(v).toJSON(); groups.push(g); this._writeGroups(groups); return g;
  }

  editDeviceGroup(id, data) {
    var groups = this._readGroups(); var idx = groups.findIndex(function(g) { return g.DeviceGroupID === id; });
    if (idx === -1) throw new AppError(EC.DEVICE_GROUP_NOT_FOUND);
    groups[idx] = Object.assign({}, groups[idx], data); this._writeGroups(groups); return groups[idx];
  }

  deleteDeviceGroup(id) {
    var groups = this._readGroups(); var g = groups.find(function(gg) { return gg.DeviceGroupID === id; });
    if (!g) throw new AppError(EC.DEVICE_GROUP_NOT_FOUND);
    if ((g.DeviceObjectList || []).length > 0) throw new AppError(EC.DEVICE_HAS_VARIABLES, g.DeviceGroupName);
    this._writeGroups(groups.filter(function(gg) { return gg.DeviceGroupID !== id; })); return true;
  }

  // ===== 设备 =====

  getDevices(groupName) { var ds = this._readDevices(); return groupName ? ds.filter(function(d) { return d.DeviceGroup === groupName; }) : ds; }

  /**
   * 创建设备 — 核心方法
   * 1. Joi 校验
   * 2. 检查名称唯一性（同链路内 DeviceName 不重复）
   * 3. 生成 DeviceID
   * 4. 自动关联/创建链路（CollectChannelInfo.json）
   * 5. 自动生成 3 个系统变量（Status/Control/Frequency）
   * 6. 写入 DeviceInfo.json + DeviceGroupInfo.json + VarInfo.json
   */
  createDevice(data) {
    var v = Device.validate(data); var devices = this._readDevices();
    var linkName = v.LinkName || '';
    if (devices.some(function(d) { return d.DeviceName === v.DeviceName && (d.LinkName || '') === linkName; }))
      throw new AppError(EC.DEVICE_NAME_EXISTS);

    // 自动关联链路
    if (global.productType == 2 && linkName) {
      var channels = this._readChannels();
      var exists = channels.some(function(c) { return c.LinkName === linkName; });
      if (!exists) {
        channels.push({ LinkName: linkName, LinkType: v.LinkType || 'TCP', DevIDArr: [] });
        this._writeChannels(channels);
      }
    }

    // 生成设备
    var d = Device.create(v); d.DeviceID = this._genDeviceId(); var dev = d.toJSON();

    // 自动关联到设备组
    if (v.DeviceGroup) {
      var groups = this._readGroups();
      var g = groups.find(function(gg) { return gg.DeviceGroupName === v.DeviceGroup || gg.DeviceGroupID === v.DeviceGroup; });
      if (g) { if (!g.DeviceObjectList) g.DeviceObjectList = []; g.DeviceObjectList.push({ DeviceID: dev.DeviceID, DeviceName: dev.DeviceName }); this._writeGroups(groups); }
    }

    devices.push(dev); this._writeDevices(devices);

    // 生成系统变量 (Status / Control / Frequency)
    var vi = this._readVarInfo(); var tags = vi.TagList || [];
    var sysTags = [
      Object.assign({}, SYS_TAG_TPL, { TagID: require('uuid').v1(), TagName: '$Status', Description: '通讯状态', DeviceID: dev.DeviceID, DeviceName: dev.DeviceName, TagGroup: 'System' }),
      Object.assign({}, SYS_TAG_TPL, { TagID: require('uuid').v1(), TagName: '$Control', Description: '通讯控制', DeviceID: dev.DeviceID, DeviceName: dev.DeviceName, TagGroup: 'System' }),
      Object.assign({}, SYS_TAG_TPL, { TagID: require('uuid').v1(), TagName: '$FrequencyValue', Description: '采集频率', DeviceID: dev.DeviceID, DeviceName: dev.DeviceName, TagGroup: 'System' }),
    ];
    tags.push.apply(tags, sysTags); vi.TagList = tags; this._writeVarInfo(vi);

    return dev;
  }

  /** 批量创建 — 导入优化：单次落盘 */
  createDevicesBatch(list) {
    var devices = this._readDevices(), set = new Set(devices.map(function(dd) { return dd.DeviceName + '_' + (dd.LinkName || ''); })), added = [];
    list.forEach(function(raw) {
      try { var v = Device.validate(raw), key = v.DeviceName + '_' + (v.LinkName || ''); if (!set.has(key)) { var d = Device.create(v).toJSON(); devices.push(d); added.push(d); set.add(key); } } catch (_) {}
    });
    this._writeDevices(devices); return added;
  }

  editDevice(id, data) { var ds = this._readDevices(), idx = ds.findIndex(function(d) { return d.DeviceID === id; }); if (idx === -1) throw new AppError(EC.DEVICE_NOT_FOUND, id); ds[idx] = Object.assign({}, ds[idx], data); this._writeDevices(ds); return ds[idx]; }

  deleteDevices(ids) {
    var ds = this._readDevices(), groups = this._readGroups(), vi = this._readVarInfo();
    ids.forEach(function(id) { if (!ds.find(function(d) { return d.DeviceID === id; })) throw new AppError(EC.DEVICE_NOT_FOUND, id); });
    // 从设备组移除引用
    groups.forEach(function(g) { g.DeviceObjectList = (g.DeviceObjectList || []).filter(function(r) { return !ids.includes(r.DeviceID); }); });
    this._writeGroups(groups);
    // 删除关联的系统变量
    vi.TagList = (vi.TagList || []).filter(function(t) { return !ids.includes(t.DeviceID); });
    this._writeVarInfo(vi);
    this._writeDevices(ds.filter(function(d) { return !ids.includes(d.DeviceID); })); return true;
  }

  moveDevices(ids, targetGroupId) {
    var ds = this._readDevices(), groups = this._readGroups(), target = groups.find(function(g) { return g.DeviceGroupID === targetGroupId || g.DeviceGroupName === targetGroupId; });
    if (!target) throw new AppError(EC.DEVICE_GROUP_NOT_FOUND, targetGroupId);
    ids.forEach(function(id) { var d = ds.find(function(dd) { return dd.DeviceID === id; }); if (!d) throw new AppError(EC.DEVICE_NOT_FOUND, id); groups.forEach(function(g) { g.DeviceObjectList = (g.DeviceObjectList || []).filter(function(r) { return r.DeviceID !== id; }); }); if (!target.DeviceObjectList) target.DeviceObjectList = []; target.DeviceObjectList.push({ DeviceID: d.DeviceID, DeviceName: d.DeviceName }); d.DeviceGroup = targetGroupId; });
    this._writeGroups(groups); this._writeDevices(ds); return ids.map(function(id) { return ds.find(function(d) { return d.DeviceID === id; }); });
  }

  getDeviceProperty(id) { var d = this._readDevices().find(function(dd) { return dd.DeviceID === id; }); if (!d) throw new AppError(EC.DEVICE_NOT_FOUND, id); return d; }

  getRegisters(deviceName) { var d = this._readDevices().find(function(dd) { return dd.DeviceName === deviceName; }); if (!d) throw new AppError(EC.DEVICE_NOT_FOUND, deviceName); return { device: d, registers: [] }; }
}
module.exports = DeviceService;
