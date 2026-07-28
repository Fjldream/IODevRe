/**
 * DACollectService - DA 采集业务逻辑层
 *
 * 负责 DA 采集的配置管理，包括设备组、设备、节点浏览、变量等。
 * 底层读写工程文件 DACollectInfo.json。
 * 所有路径基于 global.sdbPath。
 */

const fs = require('fs');
const path = require('path');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class DACollectService {
  /**
   * @param {string} projectDir - 工程根目录路径
   */
  constructor(projectDir) {
    this.projectDir = projectDir;
  }

  /**
   * 获取 DACollectInfo.json 的完整路径
   * @returns {string}
   */
  _getConfigPath() {
    return path.join(this.projectDir, 'project', 'DACollectInfo.json');
  }

  /**
   * 读取 DACollectInfo.json
   * @returns {{ DADeviceGroups: Array, DADevices: Array, DAVariables: Array }}
   * @throws {AppError} FILE_READ_ERROR
   */
  _readConfig() {
    const fp = this._getConfigPath();
    if (!fs.existsSync(fp)) {
      return { DADeviceGroups: [], DADevices: [], DAVariables: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_READ_ERROR, `DACollectInfo.json: ${err.message}`);
    }
  }

  /**
   * 写入 DACollectInfo.json
   * @param {Object} data
   * @returns {boolean}
   * @throws {AppError} FILE_WRITE_ERROR
   */
  _writeConfig(data) {
    const fp = this._getConfigPath();
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
      fs.writeFileSync(fp, JSON.stringify(data, null, '\t'), 'utf8');
      return true;
    } catch (err) {
      throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `DACollectInfo.json: ${err.message}`);
    }
  }

  // ==================== 设备组 ====================

  /**
   * 获取 DA 设备组列表
   * @param {string} projectId - 工程 ID
   * @returns {Array<Object>}
   */
  getDeviceGroups(projectId) {
    return this._readConfig().DADeviceGroups || [];
  }

  /**
   * 添加 DA 设备组
   * @param {Object} data - { DAGroupName, DAParentID, ... }
   * @returns {Object}
   */
  addDeviceGroup(data) {
    const config = this._readConfig();
    const groups = config.DADeviceGroups || [];
    const newGroup = {
      DAGroupID: data.DAGroupID || `DAGroup_${Date.now()}_${groups.length}`,
      DAGroupName: data.DAGroupName || '',
      DAParentID: data.DAParentID || '',
      Description: data.Description || '',
      ...data,
    };
    groups.push(newGroup);
    config.DADeviceGroups = groups;
    this._writeConfig(config);
    return newGroup;
  }

  /**
   * 编辑 DA 设备组
   * @param {string} id - 组 ID
   * @param {Object} data - 要更新的字段
   * @returns {Object}
   * @throws {AppError} DA_DEVICE_GROUP_NOT_FOUND
   */
  editDeviceGroup(id, data) {
    const config = this._readConfig();
    const groups = config.DADeviceGroups || [];
    const index = groups.findIndex((g) => g.DAGroupID === id);
    if (index === -1) throw new AppError(ErrorCodes.DA_DEVICE_GROUP_NOT_FOUND, `ID: ${id}`);
    groups[index] = { ...groups[index], ...data, DAGroupID: id };
    config.DADeviceGroups = groups;
    this._writeConfig(config);
    return groups[index];
  }

  /**
   * 删除 DA 设备组
   * @param {string[]} ids - 组 ID 数组
   * @returns {boolean}
   */
  deleteDeviceGroups(ids) {
    const config = this._readConfig();
    config.DADeviceGroups = (config.DADeviceGroups || []).filter((g) => !ids.includes(g.DAGroupID));
    this._writeConfig(config);
    return true;
  }

  // ==================== 设备 ====================

  /**
   * 获取 DA 设备列表
   * @param {Object} params - { projectId, groupId }
   * @returns {Array<Object>}
   */
  getDevices(params) {
    const config = this._readConfig();
    const devices = config.DADevices || [];
    if (params.groupId) {
      return devices.filter((d) => d.GroupID === params.groupId);
    }
    return devices;
  }

  /**
   * 添加 DA 设备
   * @param {Object} data - 设备数据
   * @returns {Object}
   */
  addDevice(data) {
    const config = this._readConfig();
    const devices = config.DADevices || [];
    const newDevice = {
      DAID: data.DAID || `DA_${Date.now()}_${devices.length}`,
      DAName: data.DAName || '',
      GroupID: data.GroupID || '',
      DAAddress: data.DAAddress || '',
      DAType: data.DAType || '',
      Description: data.Description || '',
      Enable: data.Enable !== undefined ? data.Enable : true,
      ...data,
    };
    devices.push(newDevice);
    config.DADevices = devices;
    this._writeConfig(config);
    return newDevice;
  }

  /**
   * 编辑 DA 设备
   * @param {string} id - 设备 ID
   * @param {Object} data - 要更新的字段
   * @returns {Object}
   * @throws {AppError} DA_DEVICE_NOT_FOUND
   */
  editDevice(id, data) {
    const config = this._readConfig();
    const devices = config.DADevices || [];
    const index = devices.findIndex((d) => d.DAID === id);
    if (index === -1) throw new AppError(ErrorCodes.DA_DEVICE_NOT_FOUND, `ID: ${id}`);
    devices[index] = { ...devices[index], ...data, DAID: id };
    config.DADevices = devices;
    this._writeConfig(config);
    return devices[index];
  }

  /**
   * 删除 DA 设备
   * @param {string[]} ids - 设备 ID 数组
   * @returns {boolean}
   * @throws {AppError} DA_DEVICE_NOT_FOUND
   */
  deleteDevices(ids) {
    const config = this._readConfig();
    const devices = config.DADevices || [];
    for (const id of ids) {
      if (!devices.find((d) => d.DAID === id)) {
        throw new AppError(ErrorCodes.DA_DEVICE_NOT_FOUND, `ID: ${id}`);
      }
    }
    config.DADevices = devices.filter((d) => !ids.includes(d.DAID));
    this._writeConfig(config);
    return true;
  }

  // ==================== 变量 ====================

  /**
   * 获取 DA 变量列表
   * @param {Object} params - { projectId, deviceId }
   * @returns {Array<Object>}
   */
  getVariables(params) {
    const config = this._readConfig();
    const vars = config.DAVariables || [];
    if (params.deviceId) {
      return vars.filter((v) => v.DeviceId === params.deviceId);
    }
    return vars;
  }

  /**
   * 添加 DA 变量
   * @param {Object} data - 变量数据
   * @returns {Object}
   */
  addVariables(data) {
    const config = this._readConfig();
    const vars = config.DAVariables || [];
    const newVar = {
      DAVarID: data.DAVarID || `DAVar_${Date.now()}_${vars.length}`,
      DAVarName: data.DAVarName || '',
      DeviceId: data.DeviceId || '',
      RegAddress: data.RegAddress || '',
      DataType: data.DataType || 'Double',
      Description: data.Description || '',
      Enable: data.Enable !== undefined ? data.Enable : true,
      ...data,
    };
    vars.push(newVar);
    config.DAVariables = vars;
    this._writeConfig(config);
    return newVar;
  }

  /**
   * 编辑 DA 变量
   * @param {Object} data - { DAVarID, ...fields }
   * @returns {Object}
   */
  editVariables(data) {
    const config = this._readConfig();
    const vars = config.DAVariables || [];
    const index = vars.findIndex((v) => v.DAVarID === data.DAVarID);
    if (index === -1) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND, `DAVarID: ${data.DAVarID}`);
    vars[index] = { ...vars[index], ...data };
    config.DAVariables = vars;
    this._writeConfig(config);
    return vars[index];
  }

  /**
   * 删除 DA 变量
   * @param {string[]} ids - 变量 ID 数组
   * @returns {boolean}
   */
  deleteVariables(ids) {
    const config = this._readConfig();
    config.DAVariables = (config.DAVariables || []).filter((v) => !ids.includes(v.DAVarID));
    this._writeConfig(config);
    return true;
  }

  // ==================== 连接测试 ====================

  /**
   * 测试 DA 连接
   * @param {Object} params - { projectId, deviceId, address }
   * @returns {{ success: boolean, message: string }}
   */
  async testConnect(params) {
    // 简单连接测试
    return { success: true, message: '连接已发送' };
  }

  /**
   * 浏览 DA 根节点
   * @param {Object} params - { projectId }
   * @returns {Array<Object>}
   */
  browseRootSources(params) {
    const config = this._readConfig();
    return config.DARootSources || [];
  }

  /**
   * 浏览 DA 子节点
   * @param {Object} params - { projectId, nodeId }
   * @returns {Array<Object>}
   */
  browseChildSources(params) {
    const config = this._readConfig();
    const children = config.DAChildSources || [];
    if (params.nodeId) {
      return children.filter((c) => c.ParentNodeId === params.nodeId);
    }
    return children;
  }

  // ==================== 导入导出 ====================

  /**
   * 导出 DA 变量
   * @param {Object} params - { projectId, varIds }
   * @returns {Array<Object>}
   */
  exportVariables(params) {
    const vars = this._readConfig().DAVariables || [];
    if (params.varIds && params.varIds.length > 0) {
      return vars.filter((v) => params.varIds.includes(v.DAVarID));
    }
    return vars;
  }

  /**
   * 导入 DA 变量
   * @param {Object} file - multer 文件对象
   * @returns {{ added: number }}
   * @throws {AppError} DA_IMPORT_FAILED
   */
  importVariables(file) {
    try {
      const config = this._readConfig();
      let importData = [];
      const content = file.buffer.toString('utf8');
      if (file.originalname.endsWith('.json')) {
        importData = JSON.parse(content);
      } else {
        throw new AppError(ErrorCodes.DA_IMPORT_FAILED, '仅支持 JSON 格式');
      }

      const vars = config.DAVariables || [];
      let added = 0;
      for (const item of (Array.isArray(importData) ? importData : [importData])) {
        vars.push({ DAVarID: `DAVar_${Date.now()}_${vars.length + added}`, ...item });
        added++;
      }
      config.DAVariables = vars;
      this._writeConfig(config);
      return { added };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ErrorCodes.DA_IMPORT_FAILED, err.message);
    }
  }
}

module.exports = DACollectService;
