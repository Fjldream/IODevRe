/**
 * Device 模型 — 对应 DeviceInfo.json 中 DeviceList 的每个元素
 *
 * 真实 JSON 结构（来自旧代码 addNewDevice）：
 * { DeviceList: [{ DeviceID, DeviceName, Description, DeviceGroup, DriverName,
 *    DriverVersion, SystemPlatform, DeviceProvider, DevAddress, DevNumber,
 *    LinkType, LinkIP, SerialName, SerialBaudRate, CLSID, OsType,
 *    LinkName, DeviceAddress, DeviceType,CollectTimeInterval, Timeout,
 *    ReconnectTime, Enable, ExtendField, ... }] }
 *
 * @module app/models/Device
 */
const Joi = require('joi');
const uuid = require('uuid');

class Device {
  constructor(data) {
    this.DeviceID            = data.DeviceID || uuid.v1();
    this.DeviceName          = data.DeviceName || '';
    this.Description         = data.Description || '';
    this.DeviceGroup         = data.DeviceGroup || '';
    this.DriverName          = data.DriverName || '';
    this.DriverVersion       = data.DriverVersion || '';
    this.SystemPlatform      = data.SystemPlatform || 'X86';
    this.DeviceProvider      = data.DeviceProvider || '';
    this.DevAddress          = data.DevAddress || '';
    this.DevNumber           = data.DevNumber || 1;
    this.LinkType            = data.LinkType || 'TCP';
    this.LinkIP              = data.LinkIP || '127.0.0.1';
    this.SerialName          = data.SerialName || '';
    this.SerialBaudRate      = data.SerialBaudRate || 9600;
    this.CLSID               = data.CLSID || '';
    this.OsType              = data.OsType || '';
    this.LinkName            = data.LinkName || '';
    this.DeviceAddress       = data.DeviceAddress || '';
    this.DeviceType          = data.DeviceType || 0;
    this.CollectTimeInterval = data.CollectTimeInterval || 1000;
    this.Timeout             = data.Timeout || 3000;
    this.ReconnectTime       = data.ReconnectTime || 5000;
    this.MaxReconncetInterval= data.MaxReconncetInterval || 3600000;
    this.Enable              = data.Enable !== undefined ? data.Enable : true;
    this.ExtendField         = data.ExtendField || {};
  }

  static validate(data, isUpdate) {
    const schema = Joi.object({
      DeviceName: (isUpdate ? Joi.string().optional() : Joi.string().regex(/^[a-zA-Z0-9_一-龥]+$/).required()),
      Description: Joi.string().allow('').optional(),
      DeviceGroup: Joi.string().allow('').optional(),
      DriverName: Joi.string().allow('').optional(),
      DriverVersion: Joi.string().allow('').optional(),
      DevAddress: Joi.string().allow('').optional(),
      DevNumber: Joi.number().optional(),
      LinkName: Joi.string().allow('').optional(),
      DeviceAddress: Joi.string().allow('').optional(),
      CollectTimeInterval: Joi.number().min(100).optional(),
      Timeout: Joi.number().min(100).optional(),
      ReconnectTime: Joi.number().min(100).optional(),
      Enable: Joi.boolean().optional(),
    }).unknown(true);

    const { error, value } = schema.validate(data);
    if (error) throw new Error(`设备验证失败: ${error.details[0].message}`);
    return value;
  }

  static create(data) { return new Device(this.validate(data)); }
  update(data) { Object.keys(data).forEach(k => { if (k !== 'DeviceID') this[k] = data[k]; }); return this; }
  toJSON() { return { ...this }; }
  static fromJSON(data) { return new Device(data); }
}

module.exports = Device;
