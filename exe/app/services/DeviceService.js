/**
 * DeviceService — 设备管理业务逻辑层
 *
 * 读写工程目录下的 DeviceGroupInfo.json 和 DeviceInfo.json。
 * 路径约定: ${projectDir}/project/DeviceGroupInfo.json、DeviceInfo.json
 *
 * @module app/services/DeviceService
 */
const fs   = require('fs');
const path = require('path');
const Device      = require('../models/Device');
const DeviceGroup = require('../models/DeviceGroup');
const AppError    = require('../../i18n/AppError');
const ErrorCodes  = require('../../i18n/errorCodes');

class DeviceService {
  /**
   * @param {string} projectDir — 工程根目录
   */
  constructor(projectDir) {
    this.projectDir = projectDir;
  }

  // ---------- 文件读写 ----------

  _dgiPath() { return path.join(this.projectDir, 'project', 'DeviceGroupInfo.json'); }
  _diPath()  { return path.join(this.projectDir, 'project', 'DeviceInfo.json'); }

  _read(fpath, fallback) {
    if (!fs.existsSync(fpath)) return fallback;
    try { return JSON.parse(fs.readFileSync(fpath, 'utf8')); }
    catch (e) { throw new AppError(ErrorCodes.FILE_READ_ERROR, e.message); }
  }
  _write(fpath, data) {
    const d = path.dirname(fpath);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    try { fs.writeFileSync(fpath, JSON.stringify(data, null, '\t'), 'utf8'); }
    catch (e) { throw new AppError(ErrorCodes.FILE_WRITE_ERROR, e.message); }
  }

  _readGroups()  { return this._read(this._dgiPath(), { DeviceGroupList: [] }).DeviceGroupList; }
  _readDevices() { return this._read(this._diPath(),  { DeviceList: [] }).DeviceList; }
  _writeGroups(list)  { this._write(this._dgiPath(), { DeviceGroupList: list }); }
  _writeDevices(list) { this._write(this._diPath(),  { DeviceList: list }); }

  // ---------- 设备组 CRUD ----------

  /** @returns {Array<Object>} 设备组列表 */
  getDeviceGroupList() { return this._readGroups(); }

  /**
   * 构建设备组树视图（兼容旧 getProjectDeviceGroupTreeView）
   * @returns {Array<Object>}
   */
  buildDeviceGroupTree() {
    const groups = this._readGroups();
    const devices = this._readDevices();
    return groups.map(g => ({
      ...g,
      DeviceObjectList: (g.DeviceObjectList || []).map(ref => {
        const d = devices.find(dd => dd.DeviceID === ref.DeviceID);
        return d ? { ...ref, ...d } : ref;
      }),
    }));
  }

  /**
   * @param {Object} data — { DeviceGroupName, Description }
   * @returns {Object}
   */
  createDeviceGroup(data) {
    const v = DeviceGroup.validate(data);
    const groups = this._readGroups();
    if (groups.some(g => g.DeviceGroupName === v.DeviceGroupName))
      throw new AppError(ErrorCodes.DEVICE_GROUP_NAME_EXISTS);
    const g = DeviceGroup.create(v).toJSON();
    groups.push(g);
    this._writeGroups(groups);
    return g;
  }

  /**
   * @param {string} id
   * @param {Object} data — { DeviceGroupName, Description }
   * @returns {Object}
   */
  editDeviceGroup(id, data) {
    const groups = this._readGroups();
    const idx = groups.findIndex(g => g.DeviceGroupID === id);
    if (idx === -1) throw new AppError(ErrorCodes.DEVICE_GROUP_NOT_FOUND);
    const g = DeviceGroup.fromJSON(groups[idx]);
    g.update(data);
    groups[idx] = g.toJSON();
    this._writeGroups(groups);
    return groups[idx];
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  deleteDeviceGroup(id) {
    const groups = this._readGroups();
    const g = groups.find(gg => gg.DeviceGroupID === id);
    if (!g) throw new AppError(ErrorCodes.DEVICE_GROUP_NOT_FOUND);
    if ((g.DeviceObjectList || []).length > 0) throw new AppError(ErrorCodes.DEVICE_HAS_VARIABLES);
    this._writeGroups(groups.filter(gg => gg.DeviceGroupID !== id));
    return true;
  }

  // ---------- 设备 CRUD ----------

  /** @returns {Array<Object>} */
  getDevices(groupName) {
    const list = this._readDevices();
    return groupName ? list.filter(d => d.DeviceGroup === groupName) : list;
  }

  /**
   * @param {Object} data
   * @returns {Object}
   */
  createDevice(data) {
    const v = Device.validate(data);
    const devices = this._readDevices();
    if (devices.some(d => d.DeviceName === v.DeviceName && d.LinkName === (v.LinkName || '')))
      throw new AppError(ErrorCodes.DEVICE_NAME_EXISTS);

    const d = Device.create(v).toJSON();

    // 自动关联到设备组
    if (v.DeviceGroup) {
      const groups = this._readGroups();
      const g = groups.find(gg => gg.DeviceGroupName === v.DeviceGroup || gg.DeviceGroupID === v.DeviceGroup);
      if (g) {
        if (!g.DeviceObjectList) g.DeviceObjectList = [];
        g.DeviceObjectList.push({ DeviceID: d.DeviceID, DeviceName: d.DeviceName });
        this._writeGroups(groups);
      }
    }

    devices.push(d);
    this._writeDevices(devices);
    return d;
  }

  /**
   * 批量创建（导入优化：单次落盘）
   * @param {Array<Object>} list
   * @returns {Array<Object>}
   */
  createDevicesBatch(list) {
    const devices = this._readDevices();
    const set = new Set(devices.map(dd => `${dd.DeviceName}_${dd.LinkName || ''}`));
    const added = [];
    for (const raw of list) {
      try {
        const v = Device.validate(raw);
        const key = `${v.DeviceName}_${v.LinkName || ''}`;
        if (!set.has(key)) {
          const d = Device.create(v).toJSON();
          devices.push(d); added.push(d); set.add(key);
        }
      } catch (_) { /* skip */ }
    }
    this._writeDevices(devices);
    return added;
  }

  /**
   * @param {string} id
   * @param {Object} data
   * @returns {Object}
   */
  editDevice(id, data) {
    const devices = this._readDevices();
    const idx = devices.findIndex(d => d.DeviceID === id);
    if (idx === -1) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND);
    const d = Device.fromJSON(devices[idx]);
    d.update(data);
    devices[idx] = d.toJSON();
    this._writeDevices(devices);
    return devices[idx];
  }

  /**
   * @param {string[]} ids
   * @returns {boolean}
   */
  deleteDevices(ids) {
    let devices = this._readDevices();
    for (const id of ids) if (!devices.find(d => d.DeviceID === id)) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, id);
    // 同时从设备组中移除引用
    const groups = this._readGroups();
    for (const g of groups) g.DeviceObjectList = (g.DeviceObjectList || []).filter(r => !ids.includes(r.DeviceID));
    this._writeGroups(groups);
    this._writeDevices(devices.filter(d => !ids.includes(d.DeviceID)));
    return true;
  }

  /**
   * @param {string[]} ids
   * @param {string} targetGroupName
   * @returns {Array<Object>}
   */
  moveDevices(ids, targetGroupName) {
    const devices = this._readDevices();
    const groups = this._readGroups();
    const target = groups.find(g => g.DeviceGroupName === targetGroupName || g.DeviceGroupID === targetGroupName);
    if (!target) throw new AppError(ErrorCodes.DEVICE_GROUP_NOT_FOUND, targetGroupName);

    for (const id of ids) {
      const d = devices.find(dd => dd.DeviceID === id);
      if (!d) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, id);
      // 从旧组移除
      for (const g of groups) g.DeviceObjectList = (g.DeviceObjectList || []).filter(r => r.DeviceID !== id);
      // 加入新组
      if (!target.DeviceObjectList) target.DeviceObjectList = [];
      target.DeviceObjectList.push({ DeviceID: d.DeviceID, DeviceName: d.DeviceName });
      d.DeviceGroup = targetGroupName;
    }

    this._writeGroups(groups);
    this._writeDevices(devices);
    return ids.map(id => devices.find(d => d.DeviceID === id));
  }

  /** @param {string} id @returns {Object} */
  getDeviceProperty(id) {
    const d = this._readDevices().find(dd => dd.DeviceID === id);
    if (!d) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, id);
    return d;
  }
}

module.exports = DeviceService;
