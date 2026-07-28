/**
 * VariableService — 变量管理业务逻辑层
 *
 * 读写 VarGroupInfo.json 和 VarInfo.json。
 * 导入性能优化：一次读取 → 内存合并 → 单次落盘。
 *
 * 导入模式：'overwrite' 覆盖同名 / 'append' 跳过同名 / 'toGroup' 导入到指定组
 */
const fs   = require('fs');
const path = require('path');
const Variable      = require('../models/Variable');
const VariableGroup = require('../models/VariableGroup');
const AppError      = require('../../i18n/AppError');
const ErrorCodes    = require('../../i18n/errorCodes');

class VariableService {
  constructor(projectDir) { this.projectDir = projectDir; }

  _vgiPath() { return path.join(this.projectDir, 'project', 'VarGroupInfo.json'); }
  _viPath()  { return path.join(this.projectDir, 'project', 'VarInfo.json'); }
  _diPath()  { return path.join(this.projectDir, 'project', 'DeviceInfo.json'); }

  _read(fp, fb) { if (!fs.existsSync(fp)) return fb; try { return JSON.parse(fs.readFileSync(fp,'utf8')); } catch(e) { throw new AppError(ErrorCodes.FILE_READ_ERROR, e.message); } }
  _write(fp, data) { const d = path.dirname(fp); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); try { fs.writeFileSync(fp, JSON.stringify(data, null, '\t'), 'utf8'); } catch(e) { throw new AppError(ErrorCodes.FILE_WRITE_ERROR, e.message); } }

  _readGroups()  { return this._read(this._vgiPath(), { TagGroupList: [] }).TagGroupList; }
  _readVars()    { return this._read(this._viPath(),  { TagList: [] }).TagList; }
  _writeGroups(l) { this._write(this._vgiPath(), { TagGroupList: l }); }
  _writeVars(l)   { this._write(this._viPath(),  { TagList: l }); }

  // ---- 变量组 ----

  getGroupList() { return this._readGroups(); }

  createGroup(data) {
    const v = VariableGroup.validate(data);
    const groups = this._readGroups();
    if (groups.some(g => g.TagGroupName === v.TagGroupName)) throw new AppError(ErrorCodes.VARIABLE_GROUP_NAME_EXISTS);
    const g = VariableGroup.create(v).toJSON();
    groups.push(g);
    this._writeGroups(groups);
    return g;
  }

  editGroup(id, data) {
    const groups = this._readGroups();
    const idx = groups.findIndex(g => g.TagGroupID === id);
    if (idx === -1) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND);
    groups[idx] = { ...groups[idx], ...data };
    this._writeGroups(groups);
    return groups[idx];
  }

  deleteGroup(id) {
    const groups = this._readGroups();
    const g = groups.find(gg => gg.TagGroupID === id);
    if (!g) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND);
    if ((g.TagObjectList || []).length > 0) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND, '组下存在变量');
    this._writeGroups(groups.filter(gg => gg.TagGroupID !== id));
    return true;
  }

  // ---- 变量 ----

  getVars(groupName) {
    const vars = this._readVars();
    return groupName ? vars.filter(v => v.TagGroup === groupName) : vars;
  }

  createVar(data) {
    const v = Variable.validate(data);
    const vars = this._readVars();
    if (vars.some(vv => vv.TagName === v.TagName && vv.DeviceName === (v.DeviceName || '')))
      throw new AppError(ErrorCodes.VARIABLE_NAME_EXISTS);
    const nv = Variable.create(v).toJSON();

    // 自动关联到变量组
    if (v.TagGroup) {
      const groups = this._readGroups();
      const g = groups.find(gg => gg.TagGroupName === v.TagGroup || gg.TagGroupID === v.TagGroup);
      if (g) { if (!g.TagObjectList) g.TagObjectList = []; g.TagObjectList.push({ TagID: nv.TagID, TagName: nv.TagName }); this._writeGroups(groups); }
    }

    vars.push(nv);
    this._writeVars(vars);
    return nv;
  }

  editVar(tagId, data) {
    const vars = this._readVars();
    const idx = vars.findIndex(v => v.TagID === tagId);
    if (idx === -1) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND);
    vars[idx] = { ...vars[idx], ...data };
    this._writeVars(vars);
    return vars[idx];
  }

  deleteVars(ids) {
    let vars = this._readVars();
    for (const id of ids) if (!vars.find(v => v.TagID === id)) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND, id);
    const groups = this._readGroups();
    for (const g of groups) g.TagObjectList = (g.TagObjectList || []).filter(r => !ids.includes(r.TagID));
    this._writeGroups(groups);
    this._writeVars(vars.filter(v => !ids.includes(v.TagID)));
    return true;
  }

  moveVars(ids, targetGroupName) {
    const vars = this._readVars();
    const groups = this._readGroups();
    const target = groups.find(g => g.TagGroupName === targetGroupName || g.TagGroupID === targetGroupName);
    if (!target) throw new AppError(ErrorCodes.VARIABLE_GROUP_NOT_FOUND, targetGroupName);
    for (const id of ids) {
      const v = vars.find(vv => vv.TagID === id);
      if (!v) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND, id);
      for (const g of groups) g.TagObjectList = (g.TagObjectList || []).filter(r => r.TagID !== id);
      if (!target.TagObjectList) target.TagObjectList = [];
      target.TagObjectList.push({ TagID: v.TagID, TagName: v.TagName });
      v.TagGroup = targetGroupName;
    }
    this._writeGroups(groups);
    this._writeVars(vars);
    return ids.map(id => vars.find(v => v.TagID === id));
  }

  getVarProperty(tagId) {
    const v = this._readVars().find(vv => vv.TagID === tagId);
    if (!v) throw new AppError(ErrorCodes.VARIABLE_NOT_FOUND, tagId);
    return v;
  }

  // ---- 导入（性能优化核心）----

  /**
   * 批量导入变量 — 一次读取 → 内存合并 → 单次落盘
   * @param {Array<Object>} list
   * @param {{ mode:string, groupName:string, groupId:string }} opts
   * @returns {{ added:number, overwritten:number, skipped:number, errors:Array }}
   */
  importVariables(list, opts = {}) {
    const { mode = 'append', groupName, groupId } = opts;
    const vars = this._readVars();
    const groups = this._readGroups();
    const devices = this._read(this._diPath(), { DeviceList: [] }).DeviceList;

    // 1. 处理目标组（自动创建）
    let targetGroupId = groupId || '';
    if (groupName && !targetGroupId) {
      let g = groups.find(gg => gg.TagGroupName === groupName);
      if (!g) { g = VariableGroup.create({ TagGroupName: groupName }).toJSON(); groups.push(g); }
      targetGroupId = g.TagGroupID;
    }

    // 2. 索引
    const nameMap = new Map(); // "TagName_DeviceName" → index
    vars.forEach((v, i) => nameMap.set(`${v.TagName}_${v.DeviceName || ''}`, i));

    // 3. 合并
    const result = { added: 0, overwritten: 0, skipped: 0, errors: [] };
    for (const raw of list) {
      try {
        const v = Variable.validate(raw);
        const key = `${v.TagName}_${v.DeviceName || ''}`;

        // 设备关联校验
        if (v.DeviceName && !devices.some(d => d.DeviceName === v.DeviceName)) {
          result.errors.push({ var: v.TagName, error: `设备 ${v.DeviceName} 不存在` }); continue;
        }

        const nv = Variable.create({ ...v, TagGroup: targetGroupId || v.TagGroup }).toJSON();
        if (nameMap.has(key)) {
          if (mode === 'overwrite') { const idx = nameMap.get(key); nv.TagID = vars[idx].TagID; vars[idx] = nv; result.overwritten++; }
          else { result.skipped++; }
        } else { vars.push(nv); nameMap.set(key, vars.length - 1); result.added++; }

        // 关联到组
        if (targetGroupId) {
          const g = groups.find(gg => gg.TagGroupID === targetGroupId);
          if (g) { if (!g.TagObjectList) g.TagObjectList = []; if (!g.TagObjectList.find(r => r.TagID === nv.TagID)) g.TagObjectList.push({ TagID: nv.TagID, TagName: nv.TagName }); }
        }
      } catch (e) { result.errors.push({ var: raw.TagName || 'unknown', error: e.message }); }
    }

    // 4. 单次写盘
    this._writeVars(vars);
    this._writeGroups(groups);
    return result;
  }

  // ---- 导出 ----

  exportVariables(tagNames, all) {
    const vars = this._readVars();
    if (all || !tagNames || tagNames.length === 0) return vars;
    return vars.filter(v => tagNames.includes(v.TagName));
  }
}

module.exports = VariableService;
