/**
 * VariableService - 变量管理业务逻辑层
 *
 * 负责变量组树和变量实体的 CRUD、导入导出操作。
 * 底层读写工程文件 VarInfo.json。
 *
 * 性能优化（万级以上导入）：
 * - 所有导入操作使用"一次读取 → 内存合并 → 单次落盘"策略
 * - 避免逐条 fs.writeFileSync，减少 JSON 序列化开销
 *
 * 导入模式支持：
 * - 'overwrite'：覆盖同名变量（按 TagName + DeviceName 匹配）
 * - 'append'：追加模式，跳过同名变量
 * - 'toGroup'：导入到指定变量组（组不存在则自动创建）
 */

const fs = require('fs');
const path = require('path');
const Variable = require('../models/Variable');
const VariableGroup = require('../models/VariableGroup');
const AppError = require('../../i18n/AppError');
const ErrorCodes = require('../../i18n/errorCodes');

class VariableService {
  /**
   * @param {string} projectDir - 工程根目录路径
   */
  constructor(projectDir) {
    this.projectDir = projectDir;
  }

  /** @returns {string} VarInfo.json 完整路径 */
  _getVarInfoPath() {
    return path.join(this.projectDir, 'project', 'VarInfo.json');
  }

  /** @returns {string} DeviceInfo.json 完整路径 */
  _getDeviceInfoPath() {
    return path.join(this.projectDir, 'project', 'DeviceInfo.json');
  }

  /**
   * 读取 VarInfo.json
   * @returns {{ TagList: Array, VarGroupTree: Array }}
   * @throws {AppError} FILE_READ_ERROR
   */
  _readVarInfo() {
    const fp = this._getVarInfoPath();
    if (!fs.existsSync(fp)) return { TagList: [], VarGroupTree: [] };
    try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
    catch (e) { throw new AppError(ErrorCodes.FILE_READ_ERROR, `VarInfo.json: ${e.message}`); }
  }

  /**
   * 写入 VarInfo.json（单次落盘，性能优化关键）
   * @param {Object} data
   * @returns {boolean}
   * @throws {AppError} FILE_WRITE_ERROR
   */
  _writeVarInfo(data) {
    const fp = this._getVarInfoPath();
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try { fs.writeFileSync(fp, JSON.stringify(data, null, '\t'), 'utf8'); return true; }
    catch (e) { throw new AppError(ErrorCodes.FILE_WRITE_ERROR, `VarInfo.json: ${e.message}`); }
  }

  // ==================== 变量组 ====================

  /**
   * 获取变量组树
   * @returns {Array<Object>}
   */
  getVariableGroupTree() {
    return this._readVarInfo().VarGroupTree || [];
  }

  /**
   * 在树中递归查找变量组节点
   * @param {Array<Object>} tree
   * @param {string} id
   * @returns {Object|null}
   */
  _findGroup(tree, id) {
    for (const n of tree) {
      if (n.TagGroupID === id) return n;
      if (n.Children?.length) { const f = this._findGroup(n.Children, id); if (f) return f; }
    }
    return null;
  }

  /**
   * 在树中按名称查找变量组
   * @param {Array<Object>} tree
   * @param {string} name
   * @returns {Object|null}
   */
  _findGroupByName(tree, name) {
    for (const n of tree) {
      if (n.TagGroupName === name) return n;
      if (n.Children?.length) { const f = this._findGroupByName(n.Children, name); if (f) return f; }
    }
    return null;
  }

  /**
   * 创建变量组
   * @param {Object} data - { TagGroupName, ParentID }
   * @returns {Object}
   */
  createVariableGroup(data) {
    const validated = VariableGroup.validate(data);
    const info = this._readVarInfo();
    const tree = info.VarGroupTree || [];
    const g = VariableGroup.create(validated).toJSON();
    if (validated.ParentID) {
      const p = this._findGroup(tree, validated.ParentID);
      if (!p) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND);
      if (!p.Children) p.Children = [];
      p.Children.push(g);
    } else { tree.push(g); }
    info.VarGroupTree = tree;
    this._writeVarInfo(info);
    return g;
  }

  /**
   * 编辑变量组
   * @param {string} id
   * @param {Object} data
   * @returns {Object}
   */
  editVariableGroup(id, data) {
    const info = this._readVarInfo();
    const node = this._findGroup(info.VarGroupTree || [], id);
    if (!node) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND);
    Object.keys(data).forEach(k => { if (k !== 'TagGroupID') node[k] = data[k]; });
    this._writeVarInfo(info);
    return node;
  }

  /**
   * 删除变量组（检查是否有变量归属）
   * @param {string} id
   * @returns {boolean}
   */
  deleteVariableGroup(id) {
    const info = this._readVarInfo();
    const tags = info.TagList || [];
    if (tags.some(t => t.TagGroup === id)) throw new AppError(ErrorCodes.VARIABLE_HAS_VARIABLES);
    const rem = (nodes) => nodes.filter(n => {
      if (n.TagGroupID === id) return false;
      if (n.Children) n.Children = rem(n.Children);
      return true;
    });
    info.VarGroupTree = rem(info.VarGroupTree || []);
    this._writeVarInfo(info);
    return true;
  }

  // ==================== 变量 ====================

  /**
   * 获取变量列表
   * @param {string|null} groupId - 可选，按组过滤
   * @returns {Array<Object>}
   */
  getVariables(groupId = null) {
    const tags = this._readVarInfo().TagList || [];
    return groupId ? tags.filter(t => t.TagGroup === groupId) : tags;
  }

  /**
   * 创建单个变量
   * @param {Object} data
   * @returns {Object}
   * @throws {AppError} VARIABLE_NAME_EXISTS
   */
  createVariable(data) {
    const validated = Variable.validate(data);
    const info = this._readVarInfo();
    const tags = info.TagList || [];
    const key = `${validated.TagName}_${validated.DeviceName || ''}`;
    if (tags.some(t => `${t.TagName}_${t.DeviceName || ''}` === key))
      throw new AppError(ErrorCodes.VARIABLE_NAME_EXISTS);
    const v = Variable.create(validated).toJSON();
    tags.push(v);
    info.TagList = tags;
    this._writeVarInfo(info);
    return v;
  }

  /**
   * 编辑变量
   * @param {string} tagId
   * @param {Object} data
   * @returns {Object}
   */
  editVariable(tagId, data) {
    const info = this._readVarInfo();
    const tags = info.TagList || [];
    const idx = tags.findIndex(t => t.TagID === tagId);
    if (idx === -1) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND);
    Variable.fromJSON(tags[idx]).update(data);
    tags[idx] = { ...tags[idx], ...data };
    info.TagList = tags;
    this._writeVarInfo(info);
    return tags[idx];
  }

  /**
   * 批量删除变量
   * @param {string[]} ids
   * @returns {boolean}
   */
  deleteVariables(ids) {
    const info = this._readVarInfo();
    const tags = info.TagList || [];
    for (const id of ids) if (!tags.find(t => t.TagID === id)) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND, `ID: ${id}`);
    info.TagList = tags.filter(t => !ids.includes(t.TagID));
    this._writeVarInfo(info);
    return true;
  }

  /**
   * 批量移动变量到目标组
   * @param {string[]} ids
   * @param {string} targetGroupId
   * @returns {Array<Object>}
   */
  moveVariablesToGroup(ids, targetGroupId) {
    const info = this._readVarInfo();
    const tags = info.TagList || [];
    if (targetGroupId && !this._findGroup(info.VarGroupTree || [], targetGroupId))
      throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND);
    for (const id of ids) {
      const t = tags.find(v => v.TagID === id);
      if (!t) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND, `ID: ${id}`);
      t.TagGroup = targetGroupId;
    }
    info.TagList = tags;
    this._writeVarInfo(info);
    return ids.map(id => tags.find(v => v.TagID === id));
  }

  /**
   * 获取变量属性
   * @param {string} tagId
   * @returns {Object}
   */
  getVariableProperty(tagId) {
    const t = (this._readVarInfo().TagList || []).find(v => v.TagID === tagId);
    if (!t) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND);
    return t;
  }

  // ==================== 导入（性能优化核心）====================

  /**
   * 批量导入变量
   *
   * 策略：一次读取 VarInfo.json → 内存合并 → 单次写盘。
   * 支持三种导入模式，兼容旧版所有行为。
   *
   * @param {Array<Object>} variables - 变量数据列表（可上万条）
   * @param {Object} options
   * @param {string} [options.mode='append'] - 'overwrite' | 'append' | 'toGroup'
   * @param {string} [options.groupId] - 目标变量组 ID
   * @param {string} [options.groupName] - 目标变量组名称（组不存在则自动创建）
   * @returns {{ added: number, overwritten: number, skipped: number, errors: Array }}
   */
  importVariables(variables, options = {}) {
    const { mode = 'append', groupId, groupName } = options;
    const info = this._readVarInfo();
    const existingTags = info.TagList || [];
    let tree = info.VarGroupTree || [];

    // 1. 处理目标组：若指定 groupName 且组不存在，自动创建
    let targetGroupId = groupId || '';
    if (groupName && !targetGroupId) {
      targetGroupId = this._findGroupByName(tree, groupName)?.TagGroupID;
      if (!targetGroupId) {
        const ng = VariableGroup.create({ TagGroupName: groupName }).toJSON();
        tree.push(ng);
        targetGroupId = ng.TagGroupID;
      }
    }

    // 2. 构建名称索引 Map<TagName_DeviceName, index>（O(1) 查找）
    const nameMap = new Map();
    for (let i = 0; i < existingTags.length; i++) {
      nameMap.set(`${existingTags[i].TagName}_${existingTags[i].DeviceName || ''}`, i);
    }

    // 3. 内存合并
    const result = { added: 0, overwritten: 0, skipped: 0, errors: [] };

    for (const raw of variables) {
      try {
        const validated = Variable.validate(raw);
        const key = `${validated.TagName}_${validated.DeviceName || ''}`;
        const newVar = Variable.create({
          ...validated,
          TagGroup: targetGroupId || validated.TagGroup,
        }).toJSON();

        if (nameMap.has(key)) {
          if (mode === 'overwrite') {
            // 覆盖：保留原 TagID，替换其他字段
            const idx = nameMap.get(key);
            const oldId = existingTags[idx].TagID;
            existingTags[idx] = { ...newVar, TagID: oldId };
            result.overwritten++;
          } else {
            result.skipped++; // 追加模式：跳过已有
          }
        } else {
          existingTags.push(newVar);
          nameMap.set(key, existingTags.length - 1);
          result.added++;
        }
      } catch (e) {
        result.errors.push({ var: raw.TagName || 'unknown', error: e.message });
      }
    }

    // 4. 单次写盘
    info.TagList = existingTags;
    info.VarGroupTree = tree;
    this._writeVarInfo(info);

    return result;
  }

  // ==================== 导出 ====================

  /**
   * 导出变量
   * @param {string[]} tagNames - 要导出的变量名称列表
   * @param {boolean} allExportFlag - 是否导出全部
   * @returns {Array<Object>}
   */
  exportVariables(tagNames = [], allExportFlag = false) {
    const tags = this._readVarInfo().TagList || [];
    if (allExportFlag || tagNames.length === 0) return tags;
    return tags.filter(t => tagNames.includes(t.TagName));
  }

  // ==================== 寄存器 ====================

  /**
   * 获取设备关联的寄存器列表
   * @param {string} deviceName
   * @returns {{ device: Object, registers: Array }}
   */
  getRegisters(deviceName) {
    const dp = this._getDeviceInfoPath();
    if (!fs.existsSync(dp)) return { device: null, registers: [] };
    const devInfo = JSON.parse(fs.readFileSync(dp, 'utf8'));
    const dev = (devInfo.DeviceList || []).find(d => d.DeviceName === deviceName);
    if (!dev) throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, deviceName);
    return { device: dev, registers: [] };
  }
}

module.exports = VariableService;
