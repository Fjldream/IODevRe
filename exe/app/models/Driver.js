const Joi = require('joi');
const uuid = require('uuid');
class Driver {
  constructor(data) {
    this.DriverName = data.DriverName || ''; this.DriverVersion = data.DriverVersion || '';
    this.SystemPlatform = data.SystemPlatform || 'X86'; this.PlatformType = data.PlatformType || '';
    this.DeviceProvider = data.DeviceProvider || ''; this.DeviceSeries = data.DeviceSeries || [];
    this.DriverType = data.DriverType || ''; this.DriverPath = data.DriverPath || '';
    this.InstallTime = data.InstallTime || ''; this.Description = data.Description || '';
    this.Enable = data.Enable !== undefined ? data.Enable : true; this.OsType = data.OsType || '';
  }
  static validate(d) { const s = Joi.object({ DriverName: Joi.string().required() }).unknown(true); const { error, value } = s.validate(d); if (error) throw new Error(`驱动验证: ${error.message}`); return value; }
  static create(d) { return new Driver(this.validate(d)); }
  update(d) { Object.keys(d).forEach(k => { this[k] = d[k]; }); return this; }
  toJSON() { return { ...this }; }
  static fromJSON(d) { return new Driver(d); }
}
module.exports = Driver;
