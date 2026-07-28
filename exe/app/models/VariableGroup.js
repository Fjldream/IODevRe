/**
 * VariableGroup 模型 — 对应 VarGroupInfo.json 中 TagGroupList 元素
 *
 * 真实 JSON: { TagGroupList: [{ TagGroupID, TagGroupName, TagObjectList: [{ TagID, TagName }] }] }
 */
const Joi = require('joi');
const uuid = require('uuid');

class VariableGroup {
  constructor(data) {
    this.TagGroupID    = data.TagGroupID || uuid.v1();
    this.TagGroupName  = data.TagGroupName || '';
    this.TagObjectList = data.TagObjectList || [];
  }

  static validate(data, isUpdate) {
    const schema = Joi.object({
      TagGroupName: (isUpdate ? Joi.string().optional() : Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required()),
      TagObjectList: Joi.array().optional(),
    }).unknown(true);
    const { error, value } = schema.validate(data);
    if (error) throw new Error(`变量组验证失败: ${error.details[0].message}`);
    return value;
  }

  static create(data) { return new VariableGroup(this.validate(data)); }
  update(data) { Object.keys(data).forEach(k => { if (k !== 'TagGroupID') this[k] = data[k]; }); return this; }
  toJSON() { return { TagGroupID: this.TagGroupID, TagGroupName: this.TagGroupName, TagObjectList: this.TagObjectList }; }
  static fromJSON(data) { return new VariableGroup(data); }
}

module.exports = VariableGroup;
