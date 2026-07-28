/**
 * Variable 模型 — 对应 VarInfo.json 中 TagList 的每个元素
 *
 * 真实 JSON: { TagList: [{ TagID, TagName, Description, DeviceID, DeviceName,
 *   TagGroup, TagType, TagDataType, RegDataType, AccessType, RegName, RegAddress,
 *   VarPlcInfo, CollectTimeInterval, DataConvertType, MaxRawValue, MinRawValue,
 *   MaxValue, MinValue, NonLinearName, DataCleaningType, DataCleaningUpperLimit,
 *   DataCleaningLowerLimit, ChangeRate, DeadbandRate, AlarmUpperLimit, AlarmLowerLimit }] }
 */
const Joi = require('joi');
const uuid = require('uuid');

class Variable {
  constructor(data) {
    this.TagID                  = data.TagID || uuid.v1();
    this.TagName                = data.TagName || '';
    this.Description            = data.Description || '';
    this.DeviceID               = data.DeviceID || '';
    this.DeviceName             = data.DeviceName || '';
    this.TagGroup               = data.TagGroup || 'TagGroup';
    this.TagType                = data.TagType || 4;
    this.TagDataType            = data.TagDataType || 128;
    this.RegDataType            = data.RegDataType || 128;
    this.AccessType             = data.AccessType || 0;
    this.RegName                = data.RegName || null;
    this.RegAddress             = data.RegAddress || null;
    this.VarPlcInfo             = data.VarPlcInfo || '';
    this.CollectTimeInterval    = data.CollectTimeInterval || null;
    this.DataConvertType        = data.DataConvertType || null;
    this.MaxRawValue            = data.MaxRawValue || null;
    this.MinRawValue            = data.MinRawValue || null;
    this.MaxValue               = data.MaxValue || null;
    this.MinValue               = data.MinValue || null;
    this.NonLinearName          = data.NonLinearName || '';
    this.DataCleaningType       = data.DataCleaningType || null;
    this.DataCleaningUpperLimit = data.DataCleaningUpperLimit || null;
    this.DataCleaningLowerLimit = data.DataCleaningLowerLimit || null;
    this.ChangeRate             = data.ChangeRate || null;
    this.DeadbandRate           = data.DeadbandRate || null;
    this.AlarmUpperLimit        = data.AlarmUpperLimit || null;
    this.AlarmLowerLimit        = data.AlarmLowerLimit || null;
  }

  static validate(data) {
    const schema = Joi.object({
      TagName:    Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required(),
      DeviceName: Joi.string().allow('').optional(),
      TagGroup:   Joi.string().allow('').optional(),
      TagDataType: Joi.number().optional(),
      RegDataType: Joi.number().optional(),
      RegName:     Joi.string().allow('', null).optional(),
      RegAddress:  Joi.string().allow('', null).optional(),
    }).unknown(true);
    const { error, value } = schema.validate(data);
    if (error) throw new Error(`变量验证失败: ${error.details[0].message}`);
    return value;
  }

  static create(data) { return new Variable(this.validate(data)); }
  update(data) { Object.keys(data).forEach(k => { if (k !== 'TagID') this[k] = data[k]; }); return this; }
  toJSON() { return { ...this }; }
  static fromJSON(data) { return new Variable(data); }
}

module.exports = Variable;
