const Joi = require('joi'); const uuid = require('uuid');
class TransConfig {
  constructor(d) { this.TransID = d.TransID || uuid.v1(); this.TransName = d.TransName || ''; this.TransType = d.TransType || 'MQTT'; this.TargetAddress = d.TargetAddress || ''; this.TargetPort = d.TargetPort || 1883; this.Topic = d.Topic || ''; this.Enable = d.Enable !== undefined ? d.Enable : true; }
  static validate(d) { const s = Joi.object({ TransName: Joi.string().required() }).unknown(true); const { error, value } = s.validate(d); if (error) throw new Error('转发配置验证失败'); return value; }
  static create(d) { return new TransConfig(this.validate(d)); }
  toJSON() { return { ...this }; }
}
module.exports = TransConfig;
