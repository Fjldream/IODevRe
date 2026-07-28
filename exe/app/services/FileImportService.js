const fs = require('fs'), path = require('path');
const AppError = require('../../i18n/AppError'), EC = require('../../i18n/errorCodes');
class FileImportService {
  constructor(projectDir) { this.dir = projectDir; }
  readJSON(fp) { try { return JSON.parse(fs.readFileSync(fp,'utf8')); } catch(e) { throw new AppError(EC.FILE_READ_ERROR, e.message); } }
  async parseCSV(buffer) { return await require('csvtojson')().fromString(buffer.toString('utf8')); }
  decodeBuffer(buf) { try { return buf.toString('utf8'); } catch(e) { return require('iconv-lite').decode(buf, 'gb2312'); } }
}
module.exports = FileImportService;
