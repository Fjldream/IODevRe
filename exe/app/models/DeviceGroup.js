/**
 * DeviceGroup 模型 — 对应 DeviceGroupInfo.json 中的 DeviceGroupList 元素
 *
 * 真实 JSON 结构：
 * { DeviceGroupList: [{ DeviceGroupID, DeviceGroupName, Description, DeviceObjectList: [{ DeviceID, DeviceName }] }] }
 *
 * @module app/models/DeviceGroup
 */
const Joi = require('joi');
const uuid = require('uuid');

class DeviceGroup {
  constructor(data) {
    this.DeviceGroupID   = data.DeviceGroupID || uuid.v1();
    this.DeviceGroupName = data.DeviceGroupName || '';
    this.Description     = data.Description || '';
    this.DeviceObjectList = data.DeviceObjectList || [];
  }

  static validate(data, isUpdate) {
    const schema = Joi.object({
      DeviceGroupName: (isUpdate ? Joi.string().optional() : Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required()),
      Description: Joi.string().allow('').optional(),
      DeviceObjectList: Joi.array().optional(),
    });
    const { error, value } = schema.validate(data, { allowUnknown: true });
    if (error) throw new Error(`设备组验证失败: ${error.details[0].message}`);
    return value;
  }

  static create(data) { return new DeviceGroup(this.validate(data)); }
  update(data) { Object.keys(data).forEach(k => { if (k !== 'DeviceGroupID') this[k] = data[k]; }); return this; }
  toJSON() { return { DeviceGroupID: this.DeviceGroupID, DeviceGroupName: this.DeviceGroupName, Description: this.Description, DeviceObjectList: this.DeviceObjectList }; }
  static fromJSON(data) { return new DeviceGroup(data); }
}

module.exports = DeviceGroup;
