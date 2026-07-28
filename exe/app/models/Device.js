/**
 * Device 模型 — DeviceInfo.json DeviceList 元素
 * @module app/models/Device
 */
const Joi = require('joi'); const uuid = require('uuid');

class Device {
  constructor(d) {
    this.DeviceID = d.DeviceID || uuid.v1(); this.DeviceName = d.DeviceName || '';
    this.Description = d.Description || ''; this.DeviceGroup = d.DeviceGroup || '';
    this.DriverName = d.DriverName || ''; this.DriverVersion = d.DriverVersion || '';
    this.SystemPlatform = d.SystemPlatform || 'X86'; this.DeviceProvider = d.DeviceProvider || '';
    this.DevAddress = d.DevAddress || ''; this.DevNumber = d.DevNumber || 1;
    this.LinkType = d.LinkType || 'TCP'; this.LinkIP = d.LinkIP || '';
    this.SerialName = d.SerialName || ''; this.SerialBaudRate = d.SerialBaudRate || 9600;
    this.CLSID = d.CLSID || ''; this.OsType = d.OsType || '';
    this.LinkName = d.LinkName || ''; this.DeviceAddress = d.DeviceAddress || '';
    this.DeviceType = d.DeviceType || 0;
    this.CollectTimeInterval = d.CollectTimeInterval || 1000;
    this.Timeout = d.Timeout || 3000; this.ReconnectTime = d.ReconnectTime || 5000;
    this.MaxReconncetInterval = d.MaxReconncetInterval || 3600000;
    this.Enable = d.Enable !== undefined ? d.Enable : true; this.ExtendField = d.ExtendField || {};
  }

  static validate(d, isUpdate) {
    const s = Joi.object({
      DeviceName: (isUpdate ? Joi.string().optional() : Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required()),
      Description: Joi.string().allow('').optional(), DeviceGroup: Joi.string().allow('').optional(),
      DriverName: Joi.string().allow('').optional(), DriverVersion: Joi.string().allow('').optional(),
      DevAddress: Joi.string().allow('').optional(), DevNumber: Joi.number().optional(),
      LinkName: Joi.string().allow('').optional(), DeviceAddress: Joi.string().allow('').optional(),
      CollectTimeInterval: Joi.number().min(100).optional(), Timeout: Joi.number().min(100).optional(),
      ReconnectTime: Joi.number().min(100).optional(), MaxReconncetInterval: Joi.number().optional(),
      Enable: Joi.boolean().optional(),
    }).unknown(true);
    const { error, value } = s.validate(d); if (error) throw new Error(`设备验证: ${error.details[0].message}`); return value;
  }

  static create(d) { return new Device(this.validate(d)); }
  update(d) { Object.keys(d).forEach(k => { if (k !== 'DeviceID') this[k] = d[k]; }); return this; }
  toJSON() { return { ...this }; }
  static fromJSON(d) { return new Device(d); }
}
module.exports = Device;
