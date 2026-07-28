/**
 * DeviceService - 设备管理业务逻辑层
 *
 * 负责设备组树和设备实体的 CRUD 操作，
 * 底层读写工程文件 DeviceInfo.json。
 * 所有路径基于 global.sdbPath。
 */

const fs = require('fs');
const path = require('path');
const Device = require('../models/Device');
const DeviceGroup = require('../models/DeviceGroup');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class DeviceService {
  /**
   * @param {string} projectDir - 工程根目录路径（通常为 ${sdbPath}/${projectId}）
   */
  constructor(projectDir) {
    this.projectDir = projectDir;
  }

  /**
   * 获取 DeviceInfo.json 的完整路径
   * @returns {string}
   */
  _getDeviceInfoPath() {
    return path.join(this.projectDir, 'project', 'DeviceInfo.json');
  }

  /**
   * 读取 DeviceInfo.json
   * @returns {{ DeviceList: Array, DeviceGroupTree: Array }}
   * @throws {AppError} 文件读取失败时抛出 FILE_READ_ERROR
   */
  _readDeviceInfo() {
    const filePath = this._getDeviceInfoPath();
    if (!fs.existsSync(filePath)) {
      return { DeviceList: [], DeviceGroupTree: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_READ_ERROR, `DeviceInfo.json: ${err.message}`);
    }
  }

  /**
   * 写入 DeviceInfo.json
   * @param {Object} data - 要写入的数据
   * @returns {boolean}
   * @throws {AppError} 写入失败时抛出 FILE_WRITE_ERROR
   */
  _writeDeviceInfo(data) {
    const filePath = this._getDeviceInfoPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, '\t'), 'utf8');
      return true;
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `DeviceInfo.json: ${err.message}`);
    }
  }

  // ==================== 设备组操作 ====================

  /**
   * 获取设备组树
   * @returns {Array<Object>} 树形结构的设备组列表
   */
  getDeviceGroupTree() {
    const deviceInfo = this._readDeviceInfo();
    return deviceInfo.DeviceGroupTree || [];
  }

  /**
   * 在设备组树中递归查找节点
   * @param {Array<Object>} tree - 设备组树
   * @param {string} groupId - 要查找的设备组 ID
   * @returns {Object|null} 找到的节点或 null
   */
  _findGroupInTree(tree, groupId) {
    for (const node of tree) {
      if (node.DeviceGroupID === groupId) return node;
      if (node.Children && node.Children.length > 0) {
        const found = this._findGroupInTree(node.Children, groupId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 在设备组树中按名称查找节点
   * @param {Array<Object>} tree - 设备组树
   * @param {string} name - 设备组名称
   * @returns {Object|null}
   */
  _findGroupByName(tree, name) {
    for (const node of tree) {
      if (node.DeviceGroupName === name) return node;
      if (node.Children && node.Children.length > 0) {
        const found = this._findGroupByName(node.Children, name);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 递归查找节点及其父节点引用
   * @param {Array<Object>} tree - 当前层级的节点数组
   * @param {string} groupId - 目标节点 ID
   * @returns {{ node: Object, parentArray: Array }|null}
   */
  _findNodeRef(tree, groupId) {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].DeviceGroupID === groupId) {
        return { node: tree[i], parentArray: tree, index: i };
      }
      if (tree[i].Children && tree[i].Children.length > 0) {
        const found = this._findNodeRef(tree[i].Children, groupId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 创建设备组
   * @param {Object} groupData - 设备组数据 { DeviceGroupName, ParentID, Description }
   * @returns {Object} 新创建的设备组节点
   * @throws {AppError} DEVICE_GROUP_NAME_EXISTS | DEVICE_GROUP_NOT_FOUND
   */
  createDeviceGroup(groupData) {
    const validated = DeviceGroup.validate(groupData);
    const deviceInfo = this._readDeviceInfo();
    const tree = deviceInfo.DeviceGroupTree || [];

    // 检查同级名称唯一性
    if (this._findGroupByName(tree, validated.DeviceGroupName)) {
      throw new AppError(ErrorCodes.DEVICE_GROUP_NAME_EXISTS);
    }

    const newGroup = DeviceGroup.create(validated).toJSON();

    if (validated.ParentID) {
      const ref = this._findNodeRef(tree, validated.ParentID);
      if (!ref) throw new AppError(ErrorCodes.DEVICE_GROUP_NOT_FOUND);
      if (!ref.node.Children) ref.node.Children = [];
      ref.node.Children.push(newGroup);
    } else {
      tree.push(newGroup);
    }

    deviceInfo.DeviceGroupTree = tree;
    this._writeDeviceInfo(deviceInfo);
    return newGroup;
  }

  /**
   * 编辑设备组
   * @param {string} groupId - 设备组 ID
   * @param {Object} groupData - 要更新的字段
   * @returns {Object} 更新后的节点
   * @throws {AppError} DEVICE_GROUP_NOT_FOUND
   */
  editDeviceGroup(groupId, groupData) {
    const deviceInfo = this._readDeviceInfo();
    const tree = deviceInfo.DeviceGroupTree || [];
    const ref = this._findNodeRef(tree, groupId);
    if (!ref) throw new AppError(ErrorCodes.DEVICE_GROUP_NOT_FOUND);

    Object.keys(groupData).forEach((key) => {
      if (key !== 'DeviceGroupID') {
        ref.node[key] = groupData[key];
      }
    });

    deviceInfo.DeviceGroupTree = tree;
    this._writeDeviceInfo(deviceInfo);
    return ref.node;
  }

  /**
   * 删除设备组（组下无设备时才允许删除）
   * @param {string} groupId - 设备组 ID
   * @returns {boolean}
   * @throws {AppError} DEVICE_HAS_VARIABLES - 组下有设备
   */
  deleteDeviceGroup(groupId) {
    const deviceInfo = this._readDeviceInfo();
    let tree = deviceInfo.DeviceGroupTree || [];
    const devices = deviceInfo.DeviceList || [];

    // 检查是否有设备属于该组
    const hasDevices = devices.some((d) => d.DeviceGroupID === groupId);
    if (hasDevices) throw new AppError(ErrorCodes.DEVICE_HAS_VARIABLES);

    // 递归删除
    const removeFromTree = (nodes) =>
      nodes.filter((node) => {
        if (node.DeviceGroupID === groupId) return false;
        if (node.Children) node.Children = removeFromTree(node.Children);
        return true;
      });

    deviceInfo.DeviceGroupTree = removeFromTree(tree);
    this._writeDeviceInfo(deviceInfo);
    return true;
  }

  // ==================== 设备操作 ====================

  /**
   * 获取设备列表
   * @param {string|null} deviceGroupId - 可选，按设备组过滤
   * @returns {Array<Object>} 设备数组
   */
  getDevices(deviceGroupId = null) {
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];
    if (deviceGroupId) {
      return devices.filter((d) => d.DeviceGroupID === deviceGroupId);
    }
    return devices;
  }

  /**
   * 创建单个设备
   * @param {Object} deviceData - 设备数据
   * @returns {Object} 新设备
   * @throws {AppError} DEVICE_NAME_EXISTS
   */
  createDevice(deviceData) {
    const validated = Device.validate(deviceData);
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];

    // 检查名称 + 链路唯一性
    const exists = devices.some(
      (d) => d.DeviceName === validated.DeviceName && d.LinkName === (validated.LinkName || '')
    );
    if (exists) throw new AppError(ErrorCodes.DEVICE_NAME_EXISTS);

    const newDevice = Device.create(validated).toJSON();
    devices.push(newDevice);
    deviceInfo.DeviceList = devices;
    this._writeDeviceInfo(deviceInfo);
    return newDevice;
  }

  /**
   * 批量创建设备（导入优化：单次落盘）
   * @param {Array<Object>} deviceDataList - 设备数据数组
   * @returns {Array<Object>} 新增的设备数组
   */
  createDevicesBatch(deviceDataList) {
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];
    const nameSet = new Set(devices.map((d) => `${d.DeviceName}_${d.LinkName || ''}`));

    const newDevices = [];
    for (const data of deviceDataList) {
      try {
        const validated = Device.validate(data);
        const key = `${validated.DeviceName}_${validated.LinkName || ''}`;
        if (!nameSet.has(key)) {
          const device = Device.create(validated).toJSON();
          devices.push(device);
          newDevices.push(device);
          nameSet.add(key);
        }
      } catch (e) {
        /* skip invalid entry */
      }
    }

    deviceInfo.DeviceList = devices;
    this._writeDeviceInfo(deviceInfo);
    return newDevices;
  }

  /**
   * 编辑设备
   * @param {string} deviceId - 设备 ID
   * @param {Object} deviceData - 要更新的字段
   * @returns {Object} 更新后的设备
   * @throws {AppError} DEVICE_NOT_FOUND
   */
  editDevice(deviceId, deviceData) {
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];
    const index = devices.findIndex((d) => d.DeviceID === deviceId);
    if (index === -1) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND);

    const device = Device.fromJSON(devices[index]);
    device.update(deviceData);
    devices[index] = device.toJSON();
    deviceInfo.DeviceList = devices;
    this._writeDeviceInfo(deviceInfo);
    return devices[index];
  }

  /**
   * 删除设备（同时检查变量关联）
   * @param {string[]} deviceIds - 要删除的设备 ID 数组
   * @returns {boolean}
   * @throws {AppError} DEVICE_NOT_FOUND | DEVICE_HAS_VARIABLES
   */
  deleteDevices(deviceIds) {
    const deviceInfo = this._readDeviceInfo();
    let devices = deviceInfo.DeviceList || [];

    // 检查变量关联
    const varInfoPath = path.join(this.projectDir, 'project', 'VarInfo.json');
    let varList = [];
    if (fs.existsSync(varInfoPath)) {
      try {
        varList = JSON.parse(fs.readFileSync(varInfoPath, 'utf8')).TagList || [];
      } catch (e) {
        /* ignore */
      }
    }

    for (const id of deviceIds) {
      const device = devices.find((d) => d.DeviceID === id);
      if (!device) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, `ID: ${id}`);
      const hasVars = varList.some(
        (v) => v.DeviceID === id || v.DeviceName === device.DeviceName
      );
      if (hasVars) throw new AppError(ErrorCodes.DEVICE_HAS_VARIABLES, `设备: ${device.DeviceName}`);
    }

    deviceInfo.DeviceList = devices.filter((d) => !deviceIds.includes(d.DeviceID));
    this._writeDeviceInfo(deviceInfo);
    return true;
  }

  /**
   * 获取单个设备属性
   * @param {string} deviceId - 设备 ID
   * @returns {Object} 设备对象
   * @throws {AppError} DEVICE_NOT_FOUND
   */
  getDeviceProperty(deviceId) {
    const deviceInfo = this._readDeviceInfo();
    const device = (deviceInfo.DeviceList || []).find((d) => d.DeviceID === deviceId);
    if (!device) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND);
    return device;
  }

  /**
   * 批量移动设备到目标设备组
   * @param {string[]} deviceIds - 设备 ID 数组
   * @param {string} targetGroupId - 目标设备组 ID（空字符串表示移到根）
   * @returns {Array<Object>} 移动后的设备数组
   * @throws {AppError} DEVICE_NOT_FOUND | DEVICE_GROUP_NOT_FOUND
   */
  moveDevices(deviceIds, targetGroupId) {
    const deviceInfo = this._readDeviceInfo();
    const devices = deviceInfo.DeviceList || [];
    const tree = deviceInfo.DeviceGroupTree || [];

    if (targetGroupId) {
      const groupExists = this._findGroupInTree(tree, targetGroupId);
      if (!groupExists) throw new AppError(ErrorCodes.DEVICE_GROUP_NOT_FOUND);
    }

    for (const id of deviceIds) {
      const device = devices.find((d) => d.DeviceID === id);
      if (!device) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, `ID: ${id}`);
      device.DeviceGroupID = targetGroupId;
    }

    deviceInfo.DeviceList = devices;
    this._writeDeviceInfo(deviceInfo);
    return deviceIds.map((id) => devices.find((d) => d.DeviceID === id));
  }

  /**
   * 获取指定设备的寄存器列表
   * @param {string} deviceName - 设备名称
   * @returns {{ device: Object, registers: Array }}
   */
  getRegisters(deviceName) {
    const deviceInfo = this._readDeviceInfo();
    const device = (deviceInfo.DeviceList || []).find((d) => d.DeviceName === deviceName);
    if (!device) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND);
    // 寄存器列表从驱动配置获取，此处返回设备引用
    return { device, registers: [] };
  }
}

module.exports = DeviceService;
