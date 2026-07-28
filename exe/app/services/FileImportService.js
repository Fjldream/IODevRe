const fs = require('fs'), path = require('path');
const AppError = require('../../i18n/AppError'), EC = require('../../i18n/errorCodes');
class FileImportService {
  constructor(projectDir) { this.dir = projectDir; }
  readJSON(fp) { try { return JSON.parse(fs.readFileSync(fp,'utf8')); } catch(e) { throw new AppError(EC.FILE_READ_ERROR, e.message); } }
  async readCSVInBatches(filePath, rowHandler, batchSize) { batchSize = batchSize || 500; var csv2Json = require('csvtojson'); var batches = [], batch = []; return new Promise(function(resolve, reject) { csv2Json().fromFile(filePath).on('data', function(row) { try { var r = rowHandler(JSON.parse(row.toString())); batch.push(r); if (batch.length >= batchSize) { batches.push(batch); batch = []; } } catch(e) {} }).on('end', function() { if (batch.length > 0) batches.push(batch); resolve(batches); }).on('error', reject); }); }
  async parseImportBuffer(buffer, filename) { var content = buffer.toString('utf8'); if (filename.endsWith('.json')) { var d = JSON.parse(content); return Array.isArray(d) ? d : (d.TagList || d.DeviceList || []); } if (filename.endsWith('.csv')) { var csv2Json = require('csvtojson'); return await csv2Json().fromString(content); } throw new AppError(EC.VALIDATION_ERROR, '不支持的文件格式: '+path.extname(filename)); }
  decodeBuffer(buf) { var iconv; try { iconv = require('iconv-lite'); } catch(e) { return buf.toString('utf8'); } if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) return buf.slice(3).toString('utf8'); try { var s = buf.toString('utf8'); if (s.indexOf('�') === -1) return s; } catch(e) {} return iconv.decode(buf, 'gb2312'); }
}
module.exports = FileImportService;
