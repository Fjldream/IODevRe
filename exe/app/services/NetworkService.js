const fs = require('fs'), path = require('path');
const AppError = require('../../i18n/AppError'), EC = require('../../i18n/errorCodes');

class NetworkService {
  constructor(projectDir) { this.dir = projectDir; }
  _read(file, fb) { const fp = path.join(this.dir, 'project', file); if (!fs.existsSync(fp)) return fb; try { return JSON.parse(fs.readFileSync(fp,'utf8')); } catch(e) { throw new AppError(EC.FILE_READ_ERROR, e.message); } }
  _write(file, data) { const fp = path.join(this.dir, 'project', file); try { fs.writeFileSync(fp, JSON.stringify(data, null, '\t'), 'utf8'); } catch(e) { throw new AppError(EC.FILE_WRITE_ERROR, e.message); } }

  getProperty() { return this._read('CollectChannelInfo.json', { CollectChannelList: [] }); }
  addConfig(data) { const info = this._read('CollectChannelInfo.json', { CollectChannelList: [] }); if (!info.CollectChannelList) info.CollectChannelList = []; info.CollectChannelList.push(data); this._write('CollectChannelInfo.json', info); return data; }
}

class StorageService {
  constructor(projectDir) { this.dir = projectDir; }
  _read() { const fp = path.join(this.dir, 'project', 'DataBaseConfig.json'); if (!fs.existsSync(fp)) return []; return JSON.parse(fs.readFileSync(fp,'utf8')).DBList || []; }
  _write(list) { fs.writeFileSync(path.join(this.dir, 'project', 'DataBaseConfig.json'), JSON.stringify({ DBList: list }, null, '\t'), 'utf8'); }
  getList() { return this._read(); }
  addConfig(data) { const list = this._read(); list.push(data); this._write(list); return data; }
  getById(id) { const c = this._read().find(d => d.StorageID === id); if (!c) throw new AppError(EC.STORAGE_NOT_FOUND); return c; }
  deleteConfig(ids) { this._write(this._read().filter(d => !ids.includes(d.StorageID))); return true; }
  editConfig(id, data) { const list = this._read(); const idx = list.findIndex(d => d.StorageID === id); if (idx === -1) throw new AppError(EC.STORAGE_NOT_FOUND); list[idx] = { ...list[idx], ...data }; this._write(list); return list[idx]; }
  getDBProperty(dbType) { return { dbType }; }
}

class TransService {
  constructor(projectDir) { this.dir = projectDir; }
  _read() { const fp = path.join(this.dir, 'project', 'DataTransConfig.json'); if (!fs.existsSync(fp)) return []; return JSON.parse(fs.readFileSync(fp,'utf8')).TransList || []; }
  _write(list) { fs.writeFileSync(path.join(this.dir, 'project', 'DataTransConfig.json'), JSON.stringify({ TransList: list }, null, '\t'), 'utf8'); }
  getTypes() { return [{ name:'云平台类型', field:'transType', value:'5' }]; }
  getDBConfig() { return this._read(); }
  addConfig(data) { const list = this._read(); list.push(data); this._write(list); return data; }
  getById(id) { const c = this._read().find(d => d.TransID === id); if (!c) throw new AppError(EC.TRANS_NOT_FOUND); return c; }
  deleteConfig(ids) { this._write(this._read().filter(d => !ids.includes(d.TransID))); return true; }
  updateConfig(id, data) { const list = this._read(); const idx = list.findIndex(d => d.TransID === id); if (idx === -1) throw new AppError(EC.TRANS_NOT_FOUND); list[idx] = { ...list[idx], ...data }; this._write(list); return list[idx]; }
}

module.exports = { NetworkService, StorageService, TransService };
