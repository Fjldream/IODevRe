const Joi = require('joi'); const uuid = require('uuid');
class StorageConfig {
  constructor(d) { this.StorageID = d.StorageID || uuid.v1(); this.StorageName = d.StorageName || ''; this.DBType = d.DBType || 'SQLite'; this.DBAddress = d.DBAddress || ''; this.DBPort = d.DBPort || 3306; this.DBName = d.DBName || ''; this.UserName = d.UserName || ''; this.Password = d.Password || ''; this.Enable = d.Enable !== undefined ? d.Enable : true; }
  static validate(d) { const s = Joi.object({ StorageName: Joi.string().required() }).unknown(true); const { error, value } = s.validate(d); if (error) throw new Error('存储配置验证失败'); return value; }
  static create(d) { return new StorageConfig(this.validate(d)); }
  toJSON() { return { ...this }; }
}
module.exports = StorageConfig;
