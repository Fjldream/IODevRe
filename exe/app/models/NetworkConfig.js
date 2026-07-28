const Joi = require('joi'); const uuid = require('uuid');
class NetworkConfig {
  constructor(d) { this.NetWorkID = d.NetWorkID || uuid.v1(); this.NetWorkName = d.NetWorkName || ''; this.NetWorkType = d.NetWorkType || 1; this.IPAddress = d.IPAddress || ''; this.Port = d.Port || 502; this.Enable = d.Enable !== undefined ? d.Enable : true; }
  static validate(d) { const s = Joi.object({ NetWorkName: Joi.string().required() }).unknown(true); const { error, value } = s.validate(d); if (error) throw new Error('网络配置验证失败'); return value; }
  static create(d) { return new NetworkConfig(this.validate(d)); }
  toJSON() { return { ...this }; }
}
module.exports = NetworkConfig;
