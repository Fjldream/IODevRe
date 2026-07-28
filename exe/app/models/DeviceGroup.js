/**
 * DeviceGroup 模型 — DeviceGroupInfo.json DeviceGroupList 元素
 * @module app/models/DeviceGroup
 */
const Joi = require('joi'); const uuid = require('uuid');

class DeviceGroup {
  constructor(d) { this.DeviceGroupID = d.DeviceGroupID || uuid.v1(); this.DeviceGroupName = d.DeviceGroupName || ''; this.Description = d.Description || ''; this.DeviceObjectList = d.DeviceObjectList || []; }

  static validate(d, isUpdate) {
    const s = Joi.object({ DeviceGroupName: (isUpdate ? Joi.string().optional() : Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required()), Description: Joi.string().allow('').optional(), DeviceObjectList: Joi.array().optional() }).unknown(true);
    const { error, value } = s.validate(d); if (error) throw new Error(`设备组验证: ${error.details[0].message}`); return value;
  }

  static create(d) { return new DeviceGroup(this.validate(d)); }
  update(d) { Object.keys(d).forEach(k => { if (k !== 'DeviceGroupID') this[k] = d[k]; }); return this; }
  toJSON() { return { DeviceGroupID: this.DeviceGroupID, DeviceGroupName: this.DeviceGroupName, Description: this.Description, DeviceObjectList: this.DeviceObjectList }; }
  static fromJSON(d) { return new DeviceGroup(d); }
}
module.exports = DeviceGroup;
